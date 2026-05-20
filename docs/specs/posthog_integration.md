# PostHog Integration

> **Version**: 2.0
> **Status**: Planned
> **Last Updated**: 2026-05-20

## Summary

PostHog is wired in as the single tool for product analytics, feature flags, and channel attribution. It absorbs three previously-separate roadmap items: standalone feature flag infrastructure, analytics (originally GA + Mixpanel), and UTM parameters per channel. Session replay is intentionally deferred until post-beta with a dedicated PII-masking pass.

The integration follows the existing **Sentry init pattern**: a shared init helper, a runtime-specific config wrapper imported from `src/instrumentation.ts`, and a `'use client'` provider mounted in the root layout. **Init is gated on `NODE_ENV === 'production'`** — dev and test never talk to PostHog (matches `sentry.shared.config.ts:44` and `instrumentation-client.ts:6`). Server-side capture runs through a thin typed `analytics` wrapper exposed on the tRPC context, alongside `log` and `services`. Client-side capture is gated on the existing cookie-consent banner; server captures of authenticated business events run unconditionally under legitimate interest.

**v1 scope is Pareto-strict.** The event taxonomy answers exactly one product question — _"does completing real work drive RPG engagement, and does RPG engagement drive more real work?"_ (see `docs/specs/rpg_reward_vs_sink_metrics.md`). Everything that doesn't load-bear on that question — session login/logout events, level-up milestones, item purchase/equip sub-actions, sink-saturation balances — is explicitly deferred. The cut keeps instrumentation small enough to ship and verify in one pass; secondary questions (Reward Saturation, balance polish, ability balance tuning) get their own instrumentation later.

## Goals

1. **Answer the core reward-vs-sink question** with the minimum event set — see `docs/specs/rpg_reward_vs_sink_metrics.md` for the question framing
2. Identify users post-signup with character properties (faction, class, magic nature, locale) so cohorts work without joining tables in BI
3. Auto-capture UTM parameters on the landing page for channel attribution
4. Provide an SSR-aware feature flag helper for dark-launching beta features
5. No-op gracefully when not in production or when PostHog env vars are unset (dev/test bootstrap unaffected)
6. Respect the cookie-consent banner for client-side capture; server captures of authenticated events are always on (in prod)

## Region & Hosting

- **Region**: EU Cloud — `https://eu.i.posthog.com` (ingest), `https://eu.posthog.com` (UI/dashboard links)
- **Hosting**: PostHog Cloud (not self-hosted)
- **Reverse proxy**: None — direct hosts. Trade-off documented in [CSP / Hosts](#csp--hosts) below.

---

## Architecture

### Server init (mirrors Sentry)

Three files at the repo root, mirroring `sentry.shared.config.ts` / `sentry.server.config.ts`:

- **`posthog.shared.config.ts`** — exports `initServerPostHog()`. Gated on `NODE_ENV === 'production'` AND `POSTHOG_KEY` set; otherwise no-op.
- **`posthog.server.config.ts`** — calls `initServerPostHog()` on import.
- **`src/instrumentation.ts`** — under `NEXT_RUNTIME === 'nodejs'`, imports `../posthog.server.config` alongside the existing Sentry import. Also registers `process.on('SIGTERM', shutdownPostHog)` to flush events on Railway redeploy (single canonical lifecycle hook location).

The server PostHog client lives as a singleton in **`src/server/lib/posthog.ts`**:

```ts
import { PostHog } from 'posthog-node'
import { env } from '@/server/config'

let client: PostHog | null = null
const isProd = process.env.NODE_ENV === 'production'

export function getPostHog(): PostHog | null {
  if (!isProd) return null
  if (!env.POSTHOG_KEY) return null
  if (!client) {
    client = new PostHog(env.POSTHOG_KEY, {
      host: env.POSTHOG_HOST,
      flushAt: 20,
      flushInterval: 10_000,
      // Server captures run under legitimate interest with no PII beyond userId.
      // Disabling geoip stops PostHog from inferring location from server IPs (which
      // are infra IPs, not user IPs — would be noise anyway).
      disableGeoip: true
    })
  }
  return client
}

export async function shutdownPostHog(): Promise<void> {
  if (client) await client.shutdown()
}
```

All server captures explicitly null out network-derived person properties to keep the "no PII beyond userId" guarantee:

```ts
ph.capture({
  distinctId: userId,
  event,
  properties: { ...props, $ip: null, $useragent: null }
})
```

### Server analytics wrapper (`src/server/lib/analytics.ts`)

A typed wrapper that:

- Accepts a discriminated event union (`AnalyticsEvent`) so events and props are type-checked at every callsite
- No-ops when `getPostHog()` returns `null`
- Wraps captures in try/catch; failures route to `logger.warn({ err, event }, 'PostHog capture failed')` per `docs/specs/logging.md` conventions
- Exposes `track(distinctId, event, props)`, `identify(distinctId, traits)`, `setPersonProperties(distinctId, traits)`

```ts
export type AnalyticsEvent =
  | { name: 'user_signed_up'; props: { signup_method: 'email' | 'google'; email_domain: string } }
  | { name: 'task_completed'; props: { task_id: string; impact: 'HIGH' | 'LOW'; mana_earned: number } }
// ...
```

### tRPC context

`src/server/context.ts` exposes the wrapper on every request. Services capture via `ctx.analytics.track(ctx.user.id, ...)` in the same shape they already use `ctx.log`.

```ts
return { user, prisma, services, log, ip, analytics }
```

### Client init

**`src/lib/posthog/client.ts`** — thin wrapper around `posthog-js`. Gated on `NODE_ENV === 'production'` to match Sentry (`instrumentation-client.ts:6`):

```ts
import posthog from 'posthog-js'

const isProd = process.env.NODE_ENV === 'production'

export function initBrowserPostHog() {
  if (!isProd) return
  if (typeof window === 'undefined') return
  if (posthog.__loaded) return
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return

  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com',
    ui_host: 'https://eu.posthog.com',
    // Config snapshot — flips `capture_pageview` to `'history_change'`, which
    // auto-captures App Router transitions via the history API. No manual
    // pathname/searchParams listener (and no Suspense boundary footgun).
    defaults: '2025-05-24',
    persistence: 'localStorage+cookie',
    opt_out_capturing_by_default: true,
    disable_session_recording: true,
    autocapture: true
  })
}

export { posthog }
```

### Client provider

**`src/components/common/posthog-provider.component.tsx`** — `'use client'`:

- Calls `initBrowserPostHog()` once on mount (no-op outside prod)
- On mount, reads `localStorage['covenant.cookie_consent']` via the same `safeGet` pattern as the cookie banner; if present, calls `posthog.opt_in_capturing()`
- Listens for the existing `covenant.cookie_consent.changed` window event (already dispatched by `cookie-banner.component.tsx:47`) and re-reads consent — opt-in retroactively when it flips to accepted. No changes to the banner required.
- Calls `posthog.identify(user.id)` once the tRPC session resolves (no traits — server already `$set` durable person properties on signup/character creation). Calls `posthog.reset()` on sign-out.
- Mounted in `src/app/layout.tsx` between `<SentryProvider>` and `<TRPCProvider>`

Pageview capture is handled by the SDK via `defaults: '2025-05-24'` (history-API listener). No manual `usePathname()`/`useSearchParams()` subscription, which also avoids the Next.js 13+ Suspense-boundary requirement around `useSearchParams()`.

### Consent flow

| Step               | Action                                                                                                                                         |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 0. Env gate        | Outside `NODE_ENV === 'production'`, init is a no-op on both client and server. Dev/test never talk to PostHog.                                |
| 1. Init            | Browser SDK boots with `opt_out_capturing_by_default: true`. No requests to PostHog.                                                           |
| 2. Mount           | Provider checks `covenant.cookie_consent`. If present → `posthog.opt_in_capturing()`; SDK auto-fires first `$pageview`.                        |
| 3. Banner accept   | `cookie-banner.component.tsx:47` writes localStorage and dispatches `covenant.cookie_consent.changed`. Provider re-reads and opts in.          |
| 4. Server captures | In prod, always on when `POSTHOG_KEY` is set — authenticated business events under legitimate interest. `$ip`/`$useragent` nulled per capture. |

This means a user who refuses cookies still generates server-side events (game-loop signal preserved) but no `$pageview` / autocapture / device identifiers.

---

## Event Taxonomy

All event names use **snake_case past-tense verbs**. All property names use snake_case. PostHog's autocapture is left enabled for incidental click/form interactions on the marketing surface.

The set below is the **Pareto-strict v1 set** — only events that load-bear on the core reward-vs-sink question. Events deliberately cut from v1 (sign-in/out, level-up milestone, item purchase/equip, ability cast) are listed in [Out of Scope](#out-of-scope) with reasoning.

### Server-captured events

| Event                   | Fired from                                                                   | Required props                                                                                                               |
| ----------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `user_signed_up`        | `auth.ts` `databaseHooks.user.create.after`                                  | `signup_method` (`email` \| `google`), `email_domain`                                                                        |
| `character_created`     | `character.service.ts` `createCharacter`                                     | `faction`, `magic_nature`, `character_class`                                                                                 |
| `task_completed`        | `task.service.ts` `update` (after `addManaFromCompletion`)                   | `task_id`, `impact`, `mana_earned`, `reserve_gained`                                                                         |
| `habit_completed`       | `habit.service.ts` `createCompletion`                                        | `habit_id`, `streak_length`, `streak_tier`, `mana_earned`, `reserve_gained`                                                  |
| `objective_completed`   | `objective.service.ts` (the objective-completion path)                       | `objective_id`, `mana_earned`, `reserve_gained`                                                                              |
| `journal_entry_created` | `journal.service.ts` (entry-create path)                                     | `entry_id`, `mana_earned`, `reserve_gained`                                                                                  |
| `combat_started`        | `quest.service.ts` `startQuest` (after tactical state created)               | `quest_id`, `character_tier`, `enemy_template_id`, `encounter_index`, `reserve_at_start`, `mana_at_start`                    |
| `combat_finished`       | `combat.service.ts` — both player-victory and player-defeat resolution paths | `quest_id`, `enemy_id`, `outcome` (`'victory'` \| `'defeat'` \| `'abandoned'`), `gold_earned` (nullable on defeat/abandoned) |

> The `'abandoned'` value is reserved in the enum for a future quest-abandon UI (no current fire site — quests today only end on victory or full defeat). Tracked in `TODO.md`.

### Client-captured events

| Event                     | Trigger                                                       | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `$pageview`               | PostHog SDK via `defaults: '2025-05-24'` history-API listener | Auto-captures App Router transitions. No manual subscription, no Suspense boundary needed. **RPG-views cohort** filters `$pathname` against the authoritative RPG-views set in `CONTEXT.md` (`/quests`, `/quests/[id]`, `/inventory`, `/shop`, `/guilds`, `/tavern`). **Productivity-views cohort** filters against `/tasks`, `/habits`, `/dashboard`, `/journaling`, `/objectives`, `/calendar` (excludes `/settings` — config surface, not productivity action). |
| `$pageleave`              | PostHog SDK auto on `beforeunload`                            | Enabled by the `defaults` snapshot. Used for engagement metrics.                                                                                                                                                                                                                                                                                                                                                                                                   |
| Autocaptured clicks/forms | PostHog autocapture                                           | Marketing pages only — authenticated app surfaces wrap in `ph-no-capture` class where appropriate.                                                                                                                                                                                                                                                                                                                                                                 |

### Combat utility purity

`combat_finished` capture lives at the **service layer** (`combat.service.ts`), **not** inside `src/server/utils/combat/rewards.ts` or `attack-resolution.ts`. The combat utilities remain pure of analytics; userId is not threaded through their signatures. The defeat-result return (`goldReward`, `nextEnemy`) already exposes everything the service layer needs to assemble events.

---

## User Identification

`posthog.identify` is called from two places, but only the server sets traits:

1. **Server** (`auth.ts` user-create hook, `character.service.ts` createCharacter): sets durable `$set` person properties via `analytics.identify(userId, traits)`. This is the source of truth for person properties — no duplicate writes from the client.
2. **Client** (provider, after tRPC session resolves): calls `posthog.identify(user.id)` with no traits, purely to link the anonymous browser session to the userId so client-only `$pageview` and autocapture events attribute correctly.

Person properties (durable, set once):

- `locale` (from `i18nextLng` cookie / `accept-language` header — `src/app/layout.tsx:58`)
- `faction`
- `character_class`
- `magic_nature`
- `signup_at`

No updated person properties in v1. `tier`, `mana_reserve`, `gold_balance` were considered but cut as sink-saturation signals, not core-loop signals (see [Out of Scope](#out-of-scope)).

### UTM attribution

PostHog browser SDK auto-captures `$initial_utm_source`, `$initial_utm_medium`, `$initial_utm_campaign`, `$initial_utm_term`, `$initial_utm_content` on first identified session. No manual wiring needed beyond the SDK init. Per-event UTM is captured automatically when present in the URL.

---

## Feature Flags

**Server (`src/server/lib/feature-flags.ts`):**

Use `evaluateFlags(userId)` once per request to get a snapshot, then read flags off the snapshot. Avoids multiple `/flags` HTTP round-trips when several flags are read in one render. Wrapped in `React.cache()` for per-request memoization across RSC tree.

```ts
import { cache } from 'react'

export const getFlagsSnapshot = cache(async (userId: string) => {
  const ph = getPostHog()
  if (!ph) return null
  try {
    return await ph.evaluateFlags(userId)
  } catch (err) {
    logger.warn({ err, userId }, 'PostHog flag eval failed')
    return null
  }
})

export async function isFeatureEnabled(userId: string, key: string, fallback = false): Promise<boolean> {
  const flags = await getFlagsSnapshot(userId)
  return flags?.isEnabled(key) ?? fallback
}

export async function getFeatureFlagPayload<T>(userId: string, key: string): Promise<T | null> {
  const flags = await getFlagsSnapshot(userId)
  return (flags?.getFlagPayload(key) as T | undefined) ?? null
}
```

When firing an event right after a flag check, pass the snapshot's flags to `capture()` (`client.capture({ event, flags })`) so the event records the exact values used without another HTTP call.

**Local evaluation (future opt-in).** If flag-eval latency or HTTP volume becomes an issue, add a `POSTHOG_PERSONAL_API_KEY` and let `posthog-node` poll flag definitions into memory. Trade-off: requires a personal API key. Out of scope for v1.

**Client:**

Use `posthog.isFeatureEnabled(key)` and `posthog.onFeatureFlags(callback)` directly from `posthog-js`. Flags resolve once after `identify`.

---

## Environment Variables

Added to `src/server/config.ts` Zod schema, all optional (analytics no-ops outside prod and when unset, same convention as `BREVO_API_KEY` and the Sentry DSN):

| Variable                   | Server / Client | Default                    | Description                                                        |
| -------------------------- | --------------- | -------------------------- | ------------------------------------------------------------------ |
| `POSTHOG_KEY`              | server          | —                          | PostHog project API key (private). Server-side capture key.        |
| `POSTHOG_HOST`             | server          | `https://eu.i.posthog.com` | Server ingest host.                                                |
| `NEXT_PUBLIC_POSTHOG_KEY`  | client          | —                          | PostHog project API key (public — same value, exposed to browser). |
| `NEXT_PUBLIC_POSTHOG_HOST` | client          | `https://eu.i.posthog.com` | Browser ingest host.                                               |

Added to `.env.example` with the EU host as the default.

---

## CSP / Hosts

CSP is intentionally deferred (`next.config.ts:5`). When the dedicated CSP pass lands (separate TODO item), allowlist:

```
connect-src 'self' https://eu.i.posthog.com https://eu-assets.i.posthog.com
script-src  'self' https://eu-assets.i.posthog.com
img-src     'self' data: https://eu-assets.i.posthog.com
```

**No reverse proxy.** A `/ingest` rewrite (mirroring Sentry's `/monitoring` tunnel at `next.config.ts:72`) was considered and declined for this pass. Trade-offs:

- ✗ Ad-blockers may drop client `$pageview` and autocapture requests to `eu.i.posthog.com`
- ✓ Server-captured events (the entire core-loop signal) are unaffected — events flow from Node → PostHog without touching the browser
- ✓ Simpler init, no Next.js rewrite, no edge runtime concerns

If client-side event volume turns out materially lower than server-side after launch, revisit the proxy decision.

---

## Files

### Created

| File                                                   | Purpose                                                     |
| ------------------------------------------------------ | ----------------------------------------------------------- |
| `posthog.shared.config.ts`                             | Shared server init helper                                   |
| `posthog.server.config.ts`                             | Imported by `src/instrumentation.ts` for `nodejs` runtime   |
| `src/server/lib/posthog.ts`                            | Server singleton + `shutdownPostHog()`                      |
| `src/server/lib/analytics.ts`                          | Typed `track` / `identify` / `setPersonProperties` wrappers |
| `src/server/lib/feature-flags.ts`                      | `isFeatureEnabled`, `getFeatureFlagPayload`                 |
| `src/lib/posthog/client.ts`                            | Browser SDK init                                            |
| `src/components/common/posthog-provider.component.tsx` | Client provider — pageview, identify, consent gate          |

### Modified

| File                                          | Change                                                                                                                                          |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/server/config.ts:4`                      | Added `POSTHOG_KEY`, `POSTHOG_HOST`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` to env schema                                        |
| `.env.example`                                | Added the four keys                                                                                                                             |
| `src/instrumentation.ts:4`                    | Imports `../posthog.server.config` under `nodejs` runtime                                                                                       |
| `src/app/layout.tsx:69`                       | `<PostHogProvider>` between `<SentryProvider>` and `<TRPCProvider>`                                                                             |
| `src/server/context.ts:39`                    | Adds `analytics` to ctx return                                                                                                                  |
| `src/server/lib/auth.ts:133-159`              | `databaseHooks.user.create.after` fires `user_signed_up` + `identify`                                                                           |
| `src/server/services/task.service.ts:82`      | `task_completed` after `addManaFromCompletion` on the completing path                                                                           |
| `src/server/services/habit.service.ts:71-79`  | `habit_completed` after streak-aware mana award                                                                                                 |
| `src/server/services/objective.service.ts`    | `objective_completed` on the completion path                                                                                                    |
| `src/server/services/journal.service.ts`      | `journal_entry_created` on entry-create path                                                                                                    |
| `src/server/services/quest.service.ts:144`    | `combat_started` after tactical state created                                                                                                   |
| `src/server/services/combat.service.ts`       | `combat_finished` (`outcome: 'victory'`) at the `processEnemyDefeat` callsite; `combat_finished` (`outcome: 'defeat'`) when player HP reaches 0 |
| `src/server/services/character.service.ts:24` | `character_created` + `identify` after `createCharacter`                                                                                        |
| _(no banner change required)_                 | Provider reuses the existing `covenant.cookie_consent.changed` event already dispatched at `cookie-banner.component.tsx:47`                     |

### Dependencies

```
pnpm add posthog-js posthog-node
```

Versions: latest stable. `posthog-node` v4+ supports the `flushAt` / `flushInterval` shape used above.

---

## Out of Scope

The following are deliberately deferred. Each is a real signal — but does not load-bear on the v1 core question and would inflate instrumentation surface without proportional answer-power.

### Events cut from event taxonomy

- **`user_signed_in` / `user_signed_out`.** Retention and DAU are derivable from `$pageview` and `task_completed` time-series in PostHog. The Redis SETEX dedupe (Better Auth re-fires `session.create.after` on token rotation) was the largest single complexity item in v1.0 of this spec — cut entirely.
- **`character_leveled_up`.** Tier-progression milestone. Doesn't answer the core reward-vs-sink question. Useful for retention cohorts later; revisit when looking at tier-at-cap saturation.
- **`item_purchased` / `item_equipped`.** Gear-loop sub-actions. `combat_started` already captures RPG-engagement at higher fidelity. Reintroduce when running gear-balance work.
- **`ability_cast`.** Per-turn high-volume event for ability balance tuning. Not a core-loop signal. Defer to post-beta combat tuning pass.
- **`rpg_viewed` / `returned_to_productivity`** (proposed by `rpg_reward_vs_sink_metrics.md`). Redundant — `$pageview` with URL filters and PostHog Funnels answer the same questions natively.
- **`rpg_reward_spent`** umbrella event. Gold-spend is already in `item_purchased` (deferred above). Reserve-to-mana refill is automatic at encounter start, derivable from `combat_started.reserve_at_start` / `mana_at_start` deltas. No standalone event needed.

### Person properties cut

- **`tier`** (refreshed on level-up). Stratification nice-to-have, not core.
- **`mana_reserve`, `gold_balance`** (refreshed on every grant/spend). These answer the **Reward Saturation** sink-warning question ("are rewards piling up unspent?"), not the v1 core question. Revisit when shipping sink-saturation instrumentation.

### Other deferrals

- **Session replay.** Revisit post-beta with a dedicated PII-masking pass (mask all inputs by default, disable on `/sign-in`, `/sign-up`, `/settings`).
- **Reverse proxy** `/ingest` rewrite.
- **`@posthog/next` unified package.** Evaluated; bundles provider + middleware proxy + flag bootstrapping + identity sync. Still pre-release per PostHog's docs ("API may change before stable release"). Tracked in `TODO.md` — revisit once stable.
- **Local feature-flag evaluation** (in-memory poll of flag definitions via `posthog-node`). Requires a personal API key; defer until per-request flag latency is a concern.
- **Self-hosted PostHog**.
- **Per-event tests.** Manual verification via PostHog "Live events" dashboard during QA.
- **Quest "claim reward" event.** No claim API exists today — rewards fire on enemy defeat. Add when a claim step is introduced.
- **Onboarding-funnel events** beyond `character_created`.

---

## Verification

Init is prod-gated, so verification runs against a prod-like build (`pnpm build && pnpm start`, or a Railway preview) with `NODE_ENV=production`, valid `POSTHOG_KEY` + `NEXT_PUBLIC_POSTHOG_KEY` set against an EU PostHog project. Then verify each step in PostHog → Activity → Live events.

1. **Dev no-op** — run `pnpm dev` (NODE_ENV=development) with keys set. DevTools Network shows zero requests to `eu.i.posthog.com`. Server logs show no PostHog activity. Confirms prod gate.
2. **Signup** — `/sign-up` with a fresh email → `user_signed_up` event arrives, `distinct_id` is the new userId, `signup_method=email`, person `locale` set.
3. **Character create** — finish onboarding → `character_created` + person `$set` for `faction` / `character_class` / `magic_nature`.
4. **Task** — complete a task → `task_completed` with `mana_earned` matching the mana service output.
5. **Habit** — tick a habit on a streak day → `habit_completed` with the correct `streak_tier` (per `habit.service.ts:71-79`).
6. **Objective** — complete an objective → `objective_completed` with `mana_earned`.
7. **Journal entry** — create an entry → `journal_entry_created` with `mana_earned`.
8. **Combat victory** — start a quest → `combat_started` with `reserve_at_start` / `mana_at_start` snapshot. Defeat an enemy → `combat_finished` with `outcome: 'victory'` and `gold_earned`.
9. **Combat defeat** — die in combat → `combat_finished` with `outcome: 'defeat'` and `gold_earned: null`. Confirms defeat fire site.
10. **UTM** — visit `/` with `?utm_source=test&utm_campaign=foo` → person properties contain `$initial_utm_source=test`, `$initial_utm_campaign=foo`.
11. **Feature flag** — create flag `demo_flag` in PostHog, gate a sample render via server `isFeatureEnabled('demo_flag', userId)`, toggle in PostHog → render flips on next request.
12. **Consent gate** — clear localStorage, reload `/` → DevTools Network shows zero requests to `eu.i.posthog.com`. Click "Accept" on cookie banner → first `$pageview` fires automatically (via history listener).
13. **Server independence** — repeat (4) with localStorage cleared → `task_completed` still arrives. Confirms server-side capture is consent-independent for authenticated business events.
14. **No-PII server capture** — inspect any server-captured event in PostHog → `$ip` and `$geoip_*` fields absent. Confirms `disableGeoip` + per-capture nulling.
15. **Sign-out reset** — sign out → no `user_signed_out` event (cut in v1), but `posthog.reset()` fires; subsequent client interactions show no further person attribution.

---

## Future Phases

### Phase 2: Session replay

- Enable `posthog-js` session recording with `mask_all_text: false`, `mask_all_inputs: true`
- Disable recording on `/sign-in`, `/sign-up`, `/settings`, and any page rendering credit-card or PII forms (none today)
- Sample at 10% in production, 100% in dev

### Phase 3: Reverse proxy

If ad-blockers materially affect client capture rate (compare `$pageview` count vs. server `task_completed` count over a week), introduce a Next.js rewrite at `/ingest` mirroring the Sentry `/monitoring` tunnel pattern. Update CSP allowlist and `api_host` accordingly.

### Phase 4: Sink-saturation instrumentation

Once the v1 core-loop signal validates the reward direction, add the Sink Warning instrumentation from `docs/specs/rpg_reward_vs_sink_metrics.md`:

- Person properties `mana_reserve`, `gold_balance`, `tier` — updated via `$set` on existing captures (no new events; rides along `task_completed`, `habit_completed`, `combat_finished`)
- `character_leveled_up` event (`old_tier`, `new_tier`, `total_kills`) — separate from `combat_finished` per Combat utility purity
- `item_purchased` / `item_equipped` events for gear-loop analysis

### Phase 5: Combat balance tuning

- `ability_cast` per-turn event with `ability_id`, `mana_cost`, `combat_id` for ability balance analysis. High-volume; ship only when running balance work.

### Phase 6: Onboarding & retention funnel

- Onboarding funnel events: `landing_viewed`, `signup_started`, `onboarding_started`, `onboarding_completed`
- Combat outcome cohorts: `combat_first_victory`, `combat_first_defeat` (computed in PostHog, no code changes)
- `user_signed_in` / `user_signed_out` if DAU/retention from `$pageview` proves insufficient
