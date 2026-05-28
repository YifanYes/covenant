# PostHog Analytics & Feature Flags

> **Status**: Shipped (v1 Pareto-strict event set)
> **Last Updated**: 2026-05-28
> **Specs**: [`posthog-integration.md`](../specs/posthog-integration.md), [`posthog-integration-implementation.md`](../specs/posthog-integration-implementation.md)

## What PostHog does for us

PostHog is the single product-analytics, feature-flag, and channel-attribution tool. It absorbs three roadmap items (standalone flags, GA + Mixpanel analytics, per-channel UTMs) into one vendor. Session replay is deferred until post-beta.

The v1 instrumentation answers exactly one product question: **does completing real work drive RPG engagement, and does RPG engagement drive more real work?** (See `docs/specs/rpg_reward_vs_sink_metrics.md` for the framing.) Everything that does not load-bear on that question — sign-in/out, level-up milestones, item purchase/equip, ability casts, sink-saturation balances — is deliberately deferred.

## Hosting & gating

- **Region**: EU Cloud (`https://eu.i.posthog.com` ingest, `https://eu.posthog.com` UI).
- **Init gate**: `NODE_ENV === 'production'` on both client and server (mirrors Sentry). Dev and test never talk to PostHog.
- **Reverse proxy**: none — direct hosts. Trade-off: ad-blockers may drop client `$pageview`/autocapture; server-captured events are unaffected.
- **Env vars**: `POSTHOG_KEY`, `POSTHOG_HOST`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` — all optional, no-op when unset (`src/server/config.ts:23-28`).

## Consent model

- **Client capture** is gated on the existing cookie-consent banner. The browser SDK boots with `opt_out_capturing_by_default: true`. The `PostHogProvider` re-reads `localStorage['covenant.cookie_consent']` and the `covenant.cookie_consent.changed` event dispatched by the banner (`src/components/common/posthog-provider.component.tsx`).
- **Server capture** runs unconditionally in prod under legitimate interest for authenticated business events. `disableGeoip: true` on the server client suppresses IP-based geo enrichment (`src/server/lib/posthog.ts`); no `$ip`/`$useragent` overrides are spread per event.
- A user who refuses cookies still produces server-side events (game-loop signal preserved) but no `$pageview`, autocapture, or device identifiers.

## Event taxonomy (v1)

All event names are snake_case past-tense verbs; all property names are snake_case. Schemas live in the `AnalyticsEvent` discriminated union (`src/server/lib/analytics.ts`).

### Server-captured events

| Event                   | Fire site                                                                  | Required props                                                                          |
| ----------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `user_signed_up`        | `src/server/lib/auth.ts:178-179`                                           | `signup_method` (`email` \| `google`), `email_domain`                                   |
| `character_created`     | `src/server/services/character.service.ts:40-45`                           | `faction`, `magic_nature`, `character_class`                                            |
| `task_completed`        | `src/server/services/task.service.ts:117, 179`                             | `task_id`, `impact`, `mana_earned`, `reserve_gained`                                    |
| `habit_completed`       | `src/server/services/habit.service.ts:102`                                 | `habit_id`, `streak_length`, `streak_tier`, `mana_earned`, `reserve_gained`             |
| `objective_completed`   | `src/server/services/objective.service.ts:32`                              | `objective_id`, `mana_earned`, `reserve_gained`                                         |
| `journal_entry_created` | `src/server/services/journal.service.ts:48`                                | `entry_id`, `mana_earned`, `reserve_gained`                                             |
| `combat_started`        | `src/server/services/quest.service.ts:225`                                 | `quest_id`, `character_tier`, `enemy_template_id`, `reserve_at_start`, `mana_at_start`  |
| `combat_finished`       | `src/server/services/combat.service.ts:182, 193`; `quest.service.ts:315`   | `quest_id`, `enemy_id`, `outcome` (`victory` \| `defeat` \| `abandoned`), `gold_earned` |
| `loop_closed`           | `src/server/utils/loop-closed.utils.ts` (called from task/habit/quest)     | `d_since_signup`                                                                        |

**`signup_method` derivation.** Better Auth's `databaseHooks.user.create.after` does not carry the method, so it is derived from `context.path` (`/sign-up/email` → `email`, `/callback/google*` → `google`, default `email`).

**`combat_finished` placement.** Fires from `combat.service.ts` by inspecting the `TacticalMoveResult` returned by `playerExecuteMove` / `playerEnemyTurn`. Capture happens **inside `withQuestLock`** so two near-simultaneous calls cannot emit duplicate events. The quest-abandon path fires from `quest.service.ts:315` with `outcome: 'abandoned'` and `gold_earned: null`. Combat utilities (`rewards.ts`, `attack-resolution.ts`) remain pure of analytics.

**`encounter_index` dropped.** v1 only fires `combat_started` at `startQuest`, so a constant `0` would lie about chained-encounter coverage. The prop returns when a chained-encounter advance site adds a real index.

### `loop_closed` — the activation event

Fires exactly once per user the first time both conditions hold:

1. ≥1 task or habit completed (anything that grants mana — `task_completed` / `habit_completed` cover the surface).
2. ≥1 quest started (`combat_started` covers the surface).

The KPI: **D7 retention among `loop_closed` users ≥ 2× D7 among non-`loop_closed` users** (n ≥ 200 signups). If the ratio falls below 2×, `loop_closed` is the wrong activation event — hunt for a better one before optimizing the funnel. Rationale in `docs/specs/onboarding.original.md` §3.

**Idempotency guard.** Stored as `loopClosedAt` (ISO string) inside `Character.onboardingProgress` JSON — no schema migration, no PostHog round-trip. Key details:

- `loopClosedAt` is in `onboardingProgressSchema` (`src/shared/schemas/onboarding.schemas.ts:7-19`) but **deliberately absent** from `updateOnboardingProgressSchema`. The router cannot flip it.
- `CharacterRepository.setLoopClosedAt` (`character.repository.ts:333`) writes via a conditional SQL update that only succeeds when the key is unset — single-shot guarantee even under concurrent calls.
- `CharacterRepository.updateOnboardingProgress` defensively strips `loopClosedAt` from any patch (`character.repository.ts:315`).
- `evaluateLoopClosed` (`src/server/utils/loop-closed.utils.ts`) is invoked from `task.service.ts`, `habit.service.ts`, and `quest.service.ts` after each candidate action ticks its own onboarding flag.

### Client-captured events

| Event                     | Trigger                                                                               | Notes                                                                                                                                                                                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `$pageview`               | Browser SDK history-API listener (enabled by `defaults: '2026-01-30'` config snapshot) | Auto-captures App Router transitions. No manual `usePathname`/`useSearchParams` subscription (avoids Next.js Suspense-boundary requirement). Cohorts filter `$pathname` against RPG vs. productivity surface sets per `CONTEXT.md`. |
| `$pageleave`              | SDK auto on `beforeunload`                                                            | Used for engagement metrics.                                                                                                                                                                                                                           |
| Autocaptured clicks/forms | PostHog autocapture                                                                   | Marketing pages only — authenticated app surfaces wrap in `ph-no-capture` where appropriate.                                                                                                                                                            |

## User identification

`posthog.identify` is called from two places, but only the server sets traits.

- **Server** (`auth.ts` user-create hook + `character.service.ts` `createCharacter`): writes durable `$set` person properties via `analytics.identify(userId, traits)` / `analytics.setPersonProperties`. Source of truth.
- **Client** (`PostHogProvider`, after the tRPC session resolves): calls `posthog.identify(user.id)` with no traits, purely to link the anonymous browser session to the userId so `$pageview` and autocapture attribute correctly. Calls `posthog.reset()` on sign-out.

**Person properties (durable):** `locale`, `faction`, `character_class`, `magic_nature`, `signup_at`. No updated properties in v1; `tier`, `mana_reserve`, `gold_balance` are deferred to the sink-saturation phase.

**UTM attribution.** Browser SDK auto-captures `$initial_utm_source` / `_medium` / `_campaign` / `_term` / `_content` on first identified session. No manual wiring.

## Feature flags

- **Server**: `getFlagsSnapshot(userId)` returns a single per-request snapshot wrapped in `React.cache()` to share across the RSC tree (`src/server/lib/feature-flags.ts`). Read individual flags via `isFeatureEnabled(userId, key, fallback)` or `getFeatureFlagPayload<T>(userId, key)`. When firing an event right after a flag check, pass the snapshot's flags to `capture()` so the event records the values used without another HTTP call.
- **Client**: `posthog.isFeatureEnabled(key)` and `posthog.onFeatureFlags(callback)` directly from `posthog-js`. Flags resolve once after `identify`.
- **Local evaluation** (in-memory poll of flag definitions) requires a personal API key and is deferred until per-request flag latency becomes a concern.

## Architecture

```
posthog.shared.config.ts          init helper (no-op outside prod or when key unset)
posthog.server.config.ts          imported by instrumentation under nodejs runtime
src/instrumentation.ts            registers SIGTERM → shutdownPostHog (flush on Railway redeploy)
src/server/lib/posthog.ts         singleton getPostHog() + shutdownPostHog()
src/server/lib/analytics.ts       typed AnalyticsService (track / identify / setPersonProperties)
src/server/lib/feature-flags.ts   per-request flag snapshot
src/lib/posthog/client.ts         initBrowserPostHog (prod-gated)
src/components/common/posthog-provider.component.tsx
                                  mounted between SentryProvider and TRPCProvider in layout
```

**Service wiring**. Services that emit events take an `analytics: AnalyticsService` constructor parameter (default = module singleton). `ServiceFactory` wires the singleton in explicitly (`src/server/services/service.factory.ts`). Tests substitute a mock by constructing the service directly. There is no `ctx.analytics` on the tRPC context — the spec's original `ctx`-based plan was dropped because services in this codebase aren't router-shaped.

**Test-friendly imports.** `src/server/lib/posthog.ts` reads `process.env.POSTHOG_KEY` / `POSTHOG_HOST` directly rather than importing the validated `env` object; `loop-closed.utils.ts` lazy-imports `prisma`. Both avoid pulling the full env-validation chain into service unit tests.

## CSP allowlist

CSP is intentionally deferred (`next.config.ts:5`). When the dedicated CSP pass lands, allowlist:

```
connect-src 'self' https://eu.i.posthog.com https://eu-assets.i.posthog.com
script-src  'self' https://eu-assets.i.posthog.com
img-src     'self' data: https://eu-assets.i.posthog.com
```

## Out of scope (v1)

Cut events and properties are listed in the [spec's Out of Scope section](../specs/posthog-integration.md#out-of-scope) with reasoning. High-level:

- **Events cut**: `user_signed_in` / `user_signed_out` (derivable from `$pageview` + `task_completed`), `character_leveled_up`, `item_purchased` / `item_equipped`, `ability_cast`, `rpg_viewed` / `returned_to_productivity`, `rpg_reward_spent`.
- **Person properties cut**: `tier`, `mana_reserve`, `gold_balance` (sink-saturation signals, not core-loop).
- **Other deferrals**: session replay, `/ingest` reverse proxy, `@posthog/next` unified package (still pre-release), local flag evaluation, self-hosted PostHog, per-event automated tests, multi-step onboarding-funnel events (`landing_viewed`, `signup_started`, etc.).
- **PostHog setup wizard**: `npx @posthog/wizard@latest` was run once and its event scope was fully reverted — `user_signed_in`, `item_purchased`, `guild_created`, `guild_joined`, and `capture_exceptions: true` all conflict with the Pareto-strict v1 cut or duplicate Sentry. Only the `.env.local` keys and the generated skill folder were kept.

## Verification

Init is prod-gated, so verification runs against a prod-like build (`pnpm build && pnpm start`, or a Railway preview) with `NODE_ENV=production` and valid keys against an EU PostHog project. The full checklist (signup → character create → task → habit → objective → journal → combat victory → combat defeat → `loop_closed` → UTM → flag → consent gate → server independence → no-PII server capture → sign-out reset) is in the [spec's Verification section](../specs/posthog-integration.md#verification).

## Future phases

The spec enumerates Phase 2 (session replay) through Phase 7 (Sentry consolidation). Each is gated on the v1 core-loop signal validating before the next instrumentation surface lands.
