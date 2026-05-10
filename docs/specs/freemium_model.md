# Freemium Monetization Model

## Why

Covenant needs sustainable revenue without compromising its core philosophy: **dice are earned, never bought**. Patreon integration adds third-party dependency and operational overhead. Microtransactions per-item conflict with the "no shortcuts" brand and require ongoing content pipelines. A freemium subscription model is the standard SaaS pattern that works at pre-scale: free tier hooks users into the full RPG loop, premium unlocks depth and convenience without pay-to-win implications.

The model must never gate dice earning, combat access, or basic productivity functions — those are the core loop and must remain free to preserve trust.

## Decisions Locked

| Decision | Choice | Why |
| --- | --- | --- |
| Model | **Freemium subscription** | Predictable MRR; no per-item content pipeline; aligns with SaaS norms |
| Price | **$6–9/mo** (TBD via testing) | Competitive with Habitica Gold ($9/mo), Notion ($8/mo) |
| Payment | **Stripe** | Industry standard; handles invoicing, webhooks, trials, cancellations |
| Core loop | **Always free** | Dice, combat, quests, basic tasks/habits — never gated |
| Cosmetics | **Premium cosmetics, not sold individually** | Avoids nickel-and-diming; one price unlocks full cosmetic library |
| Guild creation | **Premium only** | Free users can join guilds, not create — community builders self-select into premium |

## Free Tier Limits

| Feature | Free Cap |
| --- | --- |
| Active tasks | 15 |
| Habits | 5 |
| Objectives | 3 |
| Areas | 2 |
| Character classes | 1 (chosen at onboarding) |
| Magic natures | 1 (chosen at onboarding) |
| Journal entries | Unlimited (no search/analytics) |
| Guild membership | Join only (cannot create) |
| Guild invite links (as officer) | N/A — cannot create guilds |
| Data export | None |

Free users get the full combat, quests, inventory, shop, map, and character progression system with no restrictions.

## Premium Features

### Productivity Depth
- **Unlimited** tasks, habits, objectives, areas
- **Advanced habit analytics** — heatmaps, streak trend graphs, weekly completion rates
- **Journal search** + mood trend graphs
- **Calendar sync** — Google Calendar two-way import/export for tasks and habits
- **Data export** — CSV and PDF export for tasks, habits, objectives, journal entries

### RPG Extras
- **All character classes** unlocked (free = 1 at onboarding)
- **All magic natures** unlocked (free = 1 at onboarding)
- **Exclusive cosmetic gear** — portrait frames, weapon skins, armor overlays, character card themes
- **Faction cosmetics** — exclusive banners, title badges, profile colors per faction
- **Hard difficulty quests** — higher enemy tier, better loot table drop rates
- **Premium character card** — enhanced shareable profile with animated border and stat display

### Social / Guild
- **Guild creation** (free users can join, not create)
- **Increased guild capacity** — 200 members vs. 50
- **More active invite links** — 20 vs. 5
- **Guild campaigns access** — Phase 2 feature; premium-only shared goal tracking
- **Guild exclusive rewards** — Phase 3 loot exclusive to guild campaign completions

### Meta
- **Early access** to new features before general release
- **Patron badge** — faction-specific title displayed on character card and guild member list
- **Priority support**

## Schema Changes

### `User` model additions

```prisma
isPremium       Boolean   @default(false)
premiumSince    DateTime?
stripeCustomerId String?  @unique
stripeSubscriptionId String? @unique
subscriptionStatus SubscriptionStatus @default(FREE)
```

```prisma
enum SubscriptionStatus {
  FREE
  ACTIVE
  PAST_DUE
  CANCELED
}
```

### Existing model limit enforcement

No schema changes needed for limits (task count, habit count, etc.) — enforced at the service layer by counting before create and throwing if over cap for non-premium users.

## Backend Changes

### New files
- `src/server/services/subscription.service.ts` — Stripe checkout session creation, webhook handler, subscription status sync
- `src/server/routers/subscription.router.ts` — `createCheckoutSession`, `createPortalSession`, `getStatus`
- `src/server/repositories/subscription.repository.ts` — read/write `stripeCustomerId`, `subscriptionStatus`, `isPremium`
- `src/app/api/webhooks/stripe/route.ts` — POST handler for Stripe webhook events (`customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`)

### Modified files
- `src/server/services/task.service.ts` — check `user.isPremium` before `createTask`; throw `FORBIDDEN` if over free limit
- `src/server/services/habit.service.ts` — same pattern
- `src/server/services/objective.service.ts` — same pattern
- `src/server/services/area.service.ts` — same pattern
- `src/server/services/guild.service.ts` — `createGuild`: throw `FORBIDDEN` if `!user.isPremium`; increase capacity to 200 for premium owners; increase max invite links to 20
- `src/server/services/character.service.ts` — `updateClass` / `updateMagicNature`: block if non-premium and not first selection
- `src/server/routers/index.ts` — register `subscriptionRouter`
- `src/server/services/service.factory.ts` — register `SubscriptionService`

### Stripe webhook events to handle
| Event | Action |
| --- | --- |
| `checkout.session.completed` | Set `isPremium = true`, `subscriptionStatus = ACTIVE`, store IDs |
| `customer.subscription.updated` | Sync status; re-enable if past-due payment resolves |
| `customer.subscription.deleted` | Set `isPremium = false`, `subscriptionStatus = CANCELED` |
| `invoice.payment_failed` | Set `subscriptionStatus = PAST_DUE`; grace period TBD |

## Frontend Changes

### New files
- `src/app/(workspace)/settings/billing/page.tsx` — subscription status, upgrade CTA, Stripe portal link for cancellation/plan changes
- `src/components/premium-gate.component.tsx` — wrapper that renders upgrade prompt when `!isPremium`; used to wrap gated UI

### Modified files
- `src/app/(workspace)/guilds/page.tsx` — wrap Create Guild button with `<PremiumGate>`
- `src/app/(workspace)/tasks/page.tsx` — show limit counter (e.g. "12 / 15 tasks") for free users; disable create at cap
- `src/app/(workspace)/habits/page.tsx` — same
- `src/app/(workspace)/objectives/page.tsx` — same
- `src/app/(workspace)/settings/page.tsx` — add Billing tab linking to billing page
- `src/app/(workspace)/guilds/_components/create-guild-dialog.component.tsx` — show premium upsell if non-premium
- Sidebar nav — add upgrade CTA for free users (small banner or icon)

### Shared state
- Add `isPremium` to user session/context so `<PremiumGate>` can read it client-side without extra fetch
- `src/store/auth.store.ts` (or equivalent session provider) — include `isPremium`, `subscriptionStatus`

## Environment Variables

```env
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID=          # monthly premium price ID
STRIPE_PORTAL_URL=        # Stripe customer portal return URL
```

## Verification

1. Create Stripe test mode product + price, set `STRIPE_PRICE_ID`
2. Run `stripe listen --forward-to localhost:3000/api/webhooks/stripe` in dev
3. Free user: verify task creation blocked at 15, habit at 5, guild creation shows premium gate
4. Complete Stripe checkout with test card `4242 4242 4242 4242` — verify `isPremium = true` in DB
5. Verify class + magic nature unlock for premium user
6. Cancel subscription in Stripe portal — verify `isPremium = false` after webhook fires
7. Simulate `invoice.payment_failed` event — verify `PAST_DUE` status, user still has access during grace period
8. Run full test suite: `pnpm test`

## Open Questions

- Grace period duration on `PAST_DUE` before access revoked (recommend 7 days)
- Whether to offer annual billing discount (e.g., 2 months free = ~17% off)
- Free trial length (7 or 14 days) — Stripe supports trial periods natively
- Exact price point — validate with beta cohort before hardcoding ($6 vs $8 vs $9)
- Guild capacity for premium: 200 may be too large for Phase 1; could start at 100
