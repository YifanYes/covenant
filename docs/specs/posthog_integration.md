# PostHog Integration

> **Version**: 1.0
> **Status**: Planned
> **Last Updated**: 2026-05-10

## Summary

PostHog is wired in as the single tool for product analytics, feature flags, and channel attribution. It absorbs three previously-separate roadmap items: standalone feature flag infrastructure, analytics (originally GA + Mixpanel), and UTM parameters per channel. Session replay is intentionally deferred until post-beta with a dedicated PII-masking pass.

The integration follows the existing **Sentry init pattern**: a shared init helper, a runtime-specific config wrapper imported from `src/instrumentation.ts`, and a `'use client'` provider mounted in the root layout. Server-side capture runs through a thin typed `analytics` wrapper exposed on the tRPC context, alongside `log` and `services`. Client-side capture is gated on the existing cookie-consent banner; server captures of authenticated business events run unconditionally under legitimate interest.

## Goals

1. Capture every event on the validated core loop — task completion, habit completion, combat start/end, character level-up, shop, equip — with consistent property naming
2. Identify users post-signup with character properties (faction, class, magic nature, locale) so cohorts work without joining tables in BI
3. Auto-capture UTM parameters on the landing page for channel attribution
4. Provide an SSR-aware feature flag helper for dark-launching beta features
5. No-op gracefully when PostHog env vars are unset (dev/test bootstrap unaffected)
6. Respect the cookie-consent banner for client-side capture; server captures of authenticated events are always on

## Region & Hosting

- **Region**: EU Cloud — `https://eu.i.posthog.com` (ingest), `https://eu.posthog.com` (UI/dashboard links)
- **Hosting**: PostHog Cloud (not self-hosted)
- **Reverse proxy**: None — direct hosts. Trade-off documented in [CSP / Hosts](#csp--hosts) below.

---

## Architecture

### Server init (mirrors Sentry)

Three files at the repo root, mirroring `sentry.shared.config.ts` / `sentry.server.config.ts`:

- **`posthog.shared.config.ts`** — exports `initServerPostHog()` reading `process.env.POSTHOG_KEY` and `process.env.POSTHOG_HOST`. No-op if `POSTHOG_KEY` is unset.
- **`posthog.server.config.ts`** — calls `initServerPostHog()` on import.
- **`src/instrumentation.ts`** — under `NEXT_RUNTIME === 'nodejs'`, imports `../posthog.server.config` alongside the existing Sentry import.

The server PostHog client lives as a singleton in **`src/server/lib/posthog.ts`**:

```ts
import { PostHog } from 'posthog-node'
import { env } from '@/server/config'

let client: PostHog | null = null

export function getPostHog(): PostHog | null {
  if (!env.POSTHOG_KEY) return null
  if (!client) {
    client = new PostHog(env.POSTHOG_KEY, {
      host: env.POSTHOG_HOST,
      flushAt: 20,
      flushInterval: 10_000
    })
  }
  return client
}

export async function shutdownPostHog(): Promise<void> {
  if (client) await client.shutdown()
}
```

A `process.on('SIGTERM', shutdownPostHog)` is registered in `posthog.server.config.ts` to flush events on Railway redeploy.

### Server analytics wrapper (`src/server/lib/analytics.ts`)

A typed wrapper that:

- Accepts a discriminated event union (`AnalyticsEvent`) so events and props are type-checked at every callsite
- No-ops when `getPostHog()` returns `null`
- Wraps captures in try/catch; failures route to `logger.warn({ err, event }, 'PostHog capture failed')` per `docs/specs/logging.md` conventions
- Exposes `track(distinctId, event, props)`, `identify(distinctId, traits)`, `setPersonProperties(distinctId, traits)`

```ts
export type AnalyticsEvent =
  | { name: 'user_signed_up'; props: { signup_method: 'email' | 'google'; email_domain: string } }
  | { name: 'task_completed'; props: { task_id: string; impact: 'HIGH' | 'LOW'; dice_earned: number } }
  // ...
```

### tRPC context

`src/server/context.ts` exposes the wrapper on every request. Services capture via `ctx.analytics.track(ctx.user.id, ...)` in the same shape they already use `ctx.log`.

```ts
return { user, prisma, services, log, ip, analytics }
```

### Client init

**`src/lib/posthog/client.ts`** — thin wrapper around `posthog-js`:

```ts
import posthog from 'posthog-js'

export function initBrowserPostHog() {
  if (typeof window === 'undefined') return
  if (posthog.__loaded) return
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return

  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com',
    ui_host: 'https://eu.posthog.com',
    persistence: 'localStorage+cookie',
    opt_out_capturing_by_default: true,
    disable_session_recording: true,
    capture_pageview: false,            // we capture manually on App Router transitions
    capture_pageleave: true,
    autocapture: true
  })
}

export { posthog }
```

### Client provider

**`src/components/common/posthog-provider.component.tsx`** — `'use client'`:

- Calls `initBrowserPostHog()` once on mount
- On mount, reads `localStorage['covenant.cookie_consent']` via the same `safeGet` pattern as the cookie banner; if present, calls `posthog.opt_in_capturing()`
- Listens for the custom `covenant:cookie-consent-accepted` window event (dispatched from the cookie banner) to opt-in retroactively
- Subscribes to `usePathname()` + `useSearchParams()` and captures `$pageview` on every route change once consented
- Calls `posthog.identify(user.id, traits)` once the tRPC session resolves; calls `posthog.reset()` on sign-out
- Mounted in `src/app/layout.tsx` between `<SentryProvider>` and `<TRPCProvider>`

### Consent flow

| Step | Action |
|---|---|
| 1. Init | Browser SDK boots with `opt_out_capturing_by_default: true`. No requests to PostHog. |
| 2. Mount | Provider checks `covenant.cookie_consent`. If present → `posthog.opt_in_capturing()` + first `$pageview`. |
| 3. Banner accept | `cookie-banner.component.tsx` writes localStorage and dispatches `covenant:cookie-consent-accepted`. Provider opts in. |
| 4. Server captures | Always on when `POSTHOG_KEY` is set — authenticated business events under legitimate interest. No PII beyond user id. |

This means a user who refuses cookies still generates server-side events (game-loop signal preserved) but no `$pageview` / autocapture / device identifiers.

---

## Event Taxonomy

All event names use **snake_case past-tense verbs**. All property names use snake_case. PostHog's autocapture is left enabled for incidental click/form interactions on the marketing surface.

### Server-captured events

| Event | Fired from | Required props |
|---|---|---|
| `user_signed_up` | `auth.ts` `databaseHooks.user.create.after` | `signup_method` (`email` \| `google`), `email_domain` |
| `user_signed_in` | `auth.ts` `databaseHooks.session.create.after`, deduped (see note) | `login_method` |
| `user_signed_out` | `auth.ts` `databaseHooks.session.delete.before` | — |
| `character_created` | `character.service.ts` `createCharacter` | `faction`, `magic_nature`, `character_class` |
| `task_completed` | `task.service.ts` `update` (after `addDiceToBank`) | `task_id`, `impact`, `dice_earned` |
| `habit_completed` | `habit.service.ts` `createCompletion` | `habit_id`, `streak_length`, `streak_tier`, `dice_earned` |
| `combat_started` | `quest.service.ts` `startQuest` (after tactical state created) | `quest_id`, `character_tier`, `enemy_template_id`, `encounter_index` |
| `combat_ended` | `combat.service.ts` callers of `executeTacticalAttack` / `executeTacticalDoctrine` (after `processEnemyDefeat` returns) | `quest_id`, `enemy_id`, `gold_earned`, `victory` |
| `character_leveled_up` | Same callsite, when `tierProgression` is non-null | `old_tier`, `new_tier`, `total_kills` |
| `item_purchased` | `store.services.ts` `purchaseItems` | `item_ids[]`, `total_cost`, `remaining_gold` |
| `item_equipped` | `character.service.ts` `equipItem` | `item_id`, `slot`, `replaced_item_id?` |

> **`user_signed_in` dedupe note.** Better Auth's `session.create.after` fires on every new session — including session refresh / token rotation. To avoid noisy login counts, the hook checks for a Redis SETEX dedupe key (`posthog:signin-dedupe:<userId>`, TTL 30 min) before capturing. If the key exists, capture is skipped. If Redis is unavailable, capture proceeds (fail-open). Dedupe lookups reuse the existing Upstash Redis client used by the auth lockout system.

### Client-captured events

| Event | Trigger | Notes |
|---|---|---|
| `$pageview` | App Router pathname/search change in `<PostHogProvider>` | Manual capture (auto disabled). Captures `$current_url`, `path`, `referrer`. |
| `$pageleave` | PostHog SDK auto on `beforeunload` | Used for engagement metrics. |
| Autocaptured clicks/forms | PostHog autocapture | Marketing pages only — authenticated app surfaces wrap in `posthog-no-capture` class where appropriate. |

### Combat utility purity

`combat_ended` and `character_leveled_up` capture lives at the **service layer** (`combat.service.ts`), **not** inside `src/server/utils/combat/rewards.ts`, `attack-resolution.ts`, or `tactical-doctrine.ts`. The combat utilities remain pure of analytics; userId is not threaded through their signatures. The defeat-result return (`goldReward`, `tierProgression`, `nextEnemy`) already exposes everything the service layer needs to assemble events.

---

## User Identification

`posthog.identify(userId, traits)` is called from two places:

1. **Server** (`auth.ts` user-create hook, `character.service.ts` createCharacter): sets durable `$set` person properties via `analytics.identify`.
2. **Client** (provider, after tRPC session resolves): calls `posthog.identify(user.id)` with the same traits so client-only `$pageview` events are attributed correctly.

Person properties (durable):

- `locale` (from `i18nextLng` cookie / `accept-language` header — `src/app/layout.tsx:58`)
- `faction`
- `character_class`
- `magic_nature`
- `signup_at`

Person properties (updated):

- `tier` — refreshed on every `character_leveled_up` event via `setPersonProperties`

### UTM attribution

PostHog browser SDK auto-captures `$initial_utm_source`, `$initial_utm_medium`, `$initial_utm_campaign`, `$initial_utm_term`, `$initial_utm_content` on first identified session. No manual wiring needed beyond the SDK init. Per-event UTM is captured automatically when present in the URL.

---

## Feature Flags

**Server (`src/server/lib/feature-flags.ts`):**

```ts
export async function isFeatureEnabled(userId: string, key: string, fallback = false): Promise<boolean> {
  const ph = getPostHog()
  if (!ph) return fallback
  try {
    return (await ph.isFeatureEnabled(key, userId)) ?? fallback
  } catch (err) {
    logger.warn({ err, key, userId }, 'PostHog flag eval failed')
    return fallback
  }
}

export async function getFeatureFlagPayload<T>(userId: string, key: string): Promise<T | null> {
  // analogous shape with payload extraction
}
```

Server flag eval is suitable for SSR — call from React Server Components or tRPC procedures. Each call is one HTTP round-trip to PostHog; cache per-request via React `cache()` if a flag is read in multiple places.

**Client:**

Use `posthog.isFeatureEnabled(key)` and `posthog.onFeatureFlags(callback)` directly from `posthog-js`. Flags resolve once after `identify`.

---

## Environment Variables

Added to `src/server/config.ts` Zod schema, all optional in dev/test (analytics no-ops when unset, same convention as `BREVO_API_KEY`):

| Variable | Server / Client | Default | Description |
|---|---|---|---|
| `POSTHOG_KEY` | server | — | PostHog project API key (private). Server-side capture key. |
| `POSTHOG_HOST` | server | `https://eu.i.posthog.com` | Server ingest host. |
| `NEXT_PUBLIC_POSTHOG_KEY` | client | — | PostHog project API key (public — same value, exposed to browser). |
| `NEXT_PUBLIC_POSTHOG_HOST` | client | `https://eu.i.posthog.com` | Browser ingest host. |

Added to `.env.example` with the EU host as the default.

---

## CSP / Hosts

CSP is intentionally deferred (`next.config.ts:5`). When the dedicated CSP pass lands (separate TODO item), allowlist:

```
connect-src 'self' https://eu.i.posthog.com https://eu-assets.i.posthog.com
script-src  'self' https://eu-assets.i.posthog.com
img-src     'self' data: https://eu-assets.i.posthog.com
```

**No reverse proxy.** A `/ingest` rewrite (mirroring Sentry's `/monitoring` tunnel at `next.config.ts:61`) was considered and declined for this pass. Trade-offs:

- ✗ Ad-blockers may drop client `$pageview` and autocapture requests to `eu.i.posthog.com`
- ✓ Server-captured events (the entire core-loop signal) are unaffected — events flow from Node → PostHog without touching the browser
- ✓ Simpler init, no Next.js rewrite, no edge runtime concerns

If client-side event volume turns out materially lower than server-side after launch, revisit the proxy decision.

---

## Files

### Created

| File | Purpose |
|---|---|
| `posthog.shared.config.ts` | Shared server init helper |
| `posthog.server.config.ts` | Imported by `src/instrumentation.ts` for `nodejs` runtime |
| `src/server/lib/posthog.ts` | Server singleton + `shutdownPostHog()` |
| `src/server/lib/analytics.ts` | Typed `track` / `identify` / `setPersonProperties` wrappers |
| `src/server/lib/feature-flags.ts` | `isFeatureEnabled`, `getFeatureFlagPayload` |
| `src/lib/posthog/client.ts` | Browser SDK init |
| `src/components/common/posthog-provider.component.tsx` | Client provider — pageview, identify, consent gate |

### Modified

| File | Change |
|---|---|
| `src/server/config.ts:4` | Added `POSTHOG_KEY`, `POSTHOG_HOST`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` to env schema |
| `.env.example` | Added the four keys |
| `src/instrumentation.ts:4` | Imports `../posthog.server.config` under `nodejs` runtime |
| `src/app/layout.tsx:69` | `<PostHogProvider>` between `<SentryProvider>` and `<TRPCProvider>` |
| `src/server/context.ts:39` | Adds `analytics` to ctx return |
| `src/server/lib/auth.ts:140-158` | `databaseHooks` fire `user_signed_up` / `user_signed_in` (deduped) / `user_signed_out`; `identify` on user create |
| `src/server/services/task.service.ts:82` | `task_completed` after `addDiceToBank` on the completing path |
| `src/server/services/habit.service.ts:70-73` | `habit_completed` after streak-aware dice award |
| `src/server/services/quest.service.ts:144` | `combat_started` after tactical state created |
| `src/server/services/combat.service.ts` | `combat_ended` and `character_leveled_up` at the callers of `executeTacticalAttack` / `executeTacticalDoctrine` |
| `src/server/services/store.services.ts:107` | `item_purchased` after inventory update |
| `src/server/services/character.service.ts:24` | `character_created` + `identify` after `createCharacter` |
| `src/server/services/character.service.ts:133` | `item_equipped` after loadout update |
| `src/app/(landing)/_components/cookie-banner.component.tsx:42` | Dispatches `covenant:cookie-consent-accepted` after `safeSet` |

### Dependencies

```
pnpm add posthog-js posthog-node
```

Versions: latest stable. `posthog-node` v4+ supports the `flushAt` / `flushInterval` shape used above.

---

## Out of Scope

The following are deliberately deferred:

- **Session replay.** Revisit post-beta with a dedicated PII-masking pass (mask all inputs by default, disable on `/sign-in`, `/sign-up`, `/settings`).
- **Reverse proxy** `/ingest` rewrite.
- **Self-hosted PostHog**.
- **Per-event tests.** Manual verification via PostHog "Live events" dashboard during QA.
- **Quest "claim reward" event.** No claim API exists today — rewards fire on enemy defeat. Add when a claim step is introduced.
- **Onboarding-funnel events** beyond `character_created`.

---

## Verification

After implementation, run `pnpm dev` with valid `POSTHOG_KEY` + `NEXT_PUBLIC_POSTHOG_KEY` set against an EU PostHog project, then verify each step in PostHog → Activity → Live events.

1. **Signup** — `/sign-up` with a fresh email → `user_signed_up` event arrives, `distinct_id` is the new userId, `signup_method=email`, person `locale` set.
2. **Character create** — finish onboarding → `character_created` + person `$set` for `faction` / `character_class` / `magic_nature`.
3. **Sign-in dedupe** — sign out, sign back in → exactly one `user_signed_in` event. Wait <30 min, force a session refresh → no duplicate `user_signed_in`. Wait >30 min, refresh → another `user_signed_in`.
4. **Task** — complete a task → `task_completed` with `dice_earned` matching the dice service output.
5. **Habit** — tick a habit on a streak day → `habit_completed` with the correct `streak_tier` (per `habit.service.ts:70-73`).
6. **Combat loop** — start a quest → `combat_started`. Defeat an enemy → `combat_ended` with `victory: true` and `gold_earned`. Cross a tier threshold → `character_leveled_up` follows; person `tier` updated.
7. **Shop** — purchase an item → `item_purchased` with correct `remaining_gold`. Equip → `item_equipped`.
8. **UTM** — visit `/` with `?utm_source=test&utm_campaign=foo` → person properties contain `$initial_utm_source=test`, `$initial_utm_campaign=foo`.
9. **Feature flag** — create flag `demo_flag` in PostHog, gate a sample render via server `isFeatureEnabled('demo_flag', userId)`, toggle in PostHog → render flips on next request.
10. **Consent gate** — clear localStorage, reload `/` → DevTools Network shows zero requests to `eu.i.posthog.com`. Click "Accept" on cookie banner → first `$pageview` fires immediately.
11. **Server independence** — repeat (4) with localStorage cleared → `task_completed` still arrives. Confirms server-side capture is consent-independent for authenticated business events.
12. **Sign-out** — sign out → `user_signed_out` event; subsequent client interactions show no further person attribution (`posthog.reset()` called).

---

## Future Phases

### Phase 2: Session replay

- Enable `posthog-js` session recording with `mask_all_text: false`, `mask_all_inputs: true`
- Disable recording on `/sign-in`, `/sign-up`, `/settings`, and any page rendering credit-card or PII forms (none today)
- Sample at 10% in production, 100% in dev

### Phase 3: Reverse proxy

If ad-blockers materially affect client capture rate (compare `$pageview` count vs. server `task_completed` count over a week), introduce a Next.js rewrite at `/ingest` mirroring the Sentry `/monitoring` tunnel pattern. Update CSP allowlist and `api_host` accordingly.

### Phase 4: Funnel & cohort instrumentation

- Onboarding funnel events: `landing_viewed`, `signup_started`, `signup_completed`, `onboarding_started`, `onboarding_completed`
- Combat outcome cohorts: `combat_first_victory`, `combat_first_defeat`
- Retention cohorts via PostHog dashboards (no code changes)
