# TODOs

## Quick Wins

- [ ] Set up `privacy@covenantrpg.com` email forwarder before going public
  - Privacy + ToS MDX now reference this address. Without forwarder, GDPR-required data-subject requests bounce.
  - Configure on covenantrpg.com DNS provider (Cloudflare Email Routing, ImprovMX, Fastmail catch-all, etc.) → forward to your gmail.

- [ ] GitHub repository settings (manual)
  - **Post-flip configuration:**
    - **Branch protection ruleset on `main`** (Settings → Rules → Rulesets → New ruleset):
      - Target: include default branch
      - Restrict deletions
      - Require a pull request before merging — required approvals `0` (solo dev cannot self-approve)
      - Require status checks to pass — add `validate` (job in `.github/workflows/pr.yml`); require branches up to date before merge
      - Block force pushes
      - Note: the `validate` check name only appears in the dropdown after the workflow has run once on `main` — open + close a no-op PR if the list is empty
    - **Security features** (Settings → Code security): Dependabot alerts, Secret scanning, optional Code scanning
    - **Repo metadata** (Settings → General): Description "Gamified productivity platform with RPG-style progression"; Topics `nextjs trpc prisma postgresql gamification productivity rpg`; Website `https://covenantrpg.com`
    - **Repo secrets** (Settings → Secrets and variables → Actions): `SENTRY_AUTH_TOKEN` only. No `RAILWAY_TOKEN` — Railway uses its GitHub app, no Actions deploy workflow today.

## High Priority

- [ ] PostHog integration — `docs/specs/posthog_integration.md`.

- [ ] Beta wipe tools. Required for controlled beta iteration.

- [ ] Welcome email + email retry/throttle
  - `EmailService` is single-attempt with 5s timeout. Verification + password-reset endpoints are rate-limited via Better Auth (3 req / 10s per IP on sign-up, 3 req / 60s on `/forget-password`), but there is no per-recipient cap and no welcome email. Abuse vector + Brevo cost risk if a single email is targeted from many IPs.
  - Also covers roadmap Phase 3: _"Email de bienvenida automatizado"_.

- [ ] Content Security Policy
  - `next.config.ts` now sets HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy (all delivered in the auth hardening pass). CSP was intentionally deferred — needs allowlist work for Next.js inline scripts, Google OAuth, and Sentry tunneling. Worth a dedicated pass.

- [ ] Account management — profile edit, data export
  - Settings page covers email/language/theme/faction/logout/delete-account but lacks profile name/character edit and GDPR-compliant data export.

- [ ] Add Github OAuth

- [ ] Render character with equipped items. Visual feedback closes the gear loop — without it, equipping a sword feels invisible.

- [ ] Press kit: Screenshots, description, logo, and a tested 2-line pitch.

- [ ] Discord setup — server, roles, welcome bot, weekly update template. Roadmap Phase 3 infrastructure block (Discord servidor, roles configurados, bot de bienvenida, template para weekly update). Beta tester comms channel.

- [ ] Mana service tests `[beta-risk]`. `src/server/services/mana.service.ts` is the reward-calc spine for tasks/habits/objectives/journaling and is the only major service without a test file. Beta launch with a quietly broken mana grant = silent core-loop break and a polluted PostHog dataset (every reward event carries `mana_earned`). Pure-function tests, no infra. New file: `src/server/__tests__/services/mana.service.test.ts`. Cover task/habit/objective/journal reward paths plus at least one streak-bonus case.

- [ ] Onboarding tutorial — Tasks vs Habits vs Quests distinction `[onboarding]` `[beta-risk]`. Promoted from Medium. Habitica's #1 churn driver: users hit the Habit/Daily/To-Do/class confusion wall. Minimum viable: `User.hasSeenOnboarding Boolean @default(false)`, one dismissable modal on first workspace entry covering task type semantics + faction/class consequences + basic combat loop, paired with empty-state one-liners on each page. Touches `prisma/schema.prisma`, new modal component, `(workspace)/layout.tsx`, i18n in both locales.

## Medium Priority

- [ ] User-defined task statuses.
  - Tasks currently use fixed statuses (TODO/IN_PROGRESS/DONE or equivalent). Allow users to create, rename, reorder, and delete custom statuses per workspace or globally. Enables personal workflows (e.g. "Waiting", "Blocked", "In Review") without forcing the default three-state model.
  - Schema: new `TaskStatus` entity (id, userId, label, color, position, isDefault); migrate existing `Task.status` enum column to FK. Guard: at least one status must remain; deletion re-assigns tasks to a chosen fallback.

- [ ] Accessibility in combat.
  - Combat grid sprites are styled `div`s with no `role="img"`, `aria-label`, or alt text. No keyboard navigation for tactical grid. ~30 aria attributes across 78 components (~38% coverage).

- [ ] 404 / invalid ID handling. Invalid quest/task IDs hit generic error boundary; no redirect to listing or "this doesn't exist" empty state.

- [ ] Re-enable strict TLS verification on prod database.
  - `src/server/lib/prisma.ts` currently runs production with `ssl: { rejectUnauthorized: false }` (channel still encrypted, chain not validated). See `docs/specs/database_ssl.md`.
  - Blocked on either: a Prisma 7 fix for the `@prisma/adapter-pg` regression (prisma/prisma#29060, #27611) — strict verification rejects Railway's cert chain even with `sslmode=verify-full` — or Railway publishing a CA bundle for managed Postgres so we can pin via `ssl.ca`.
  - **Fix when unblocked:** flip `rejectUnauthorized` back to `true` (and add `ca: env.DATABASE_SSL_CA` if pinning); update `docs/specs/database_ssl.md`.

- [ ] Flexible habit recurrence patterns `[loop]`. Schema today supports only `recurrence Int` + `timespan` enum (DAILY/WEEKLY/MONTHLY) — cannot express "Mon/Wed/Fri", "1st and 15th", or "every other day". Top recurring Habitica request. See `docs/specs/habitica_inspired_features.md` §1. Touches `prisma/schema.prisma:233-234`, `src/shared/schemas/habits.schemas.ts:3-13`.

- [ ] Consistency heatmap (year view) `[retention]`. GitHub-style year heatmap on `/dashboard` (or `/calendar`) — cells colored by total completions/day across habits + tasks, hover tooltip lists what was done. Dashboard locked to 8-day rolling window today (`src/server/services/dashboard.service.ts:28-79`). See `docs/specs/habitica_inspired_features.md` §2.

- [ ] Per-habit difficulty levels `[loop]`. Add `difficulty` enum on `Habit` (`TRIVIAL | EASY | MEDIUM | HARD`, default `EASY`); scale base dice reward (1/2/3/5) + streak bonus multiplier. Current uniform 2 dice + streak bonus (`src/server/services/habit.service.ts:74-79`) scales poorly across effort tiers. Ship reward-scaling alone; penalty modulation out of scope. Mitigate "mark everything HARD" with per-day soft cap on habit dice. See `docs/specs/habitica_inspired_features.md` §3.

- [ ] Calendar view week and day grid `[retention]`.

- [ ] Calendar timezone + scoping fixes `[bug]`. Holistic pass on `src/app/(workspace)/calendar/_components/integrated-calendar.component.tsx` + `day-details-sheet.component.tsx` + backend:
  - **Tasks router ignores timezone.** `src/server/services/task.service.ts:65-75` builds month boundaries with `new Date(y, m, 1)` — server-local time. `journaling.getMoodCalendar` accepts `timezoneOffset`; tasks should too. Users in different TZ from server get wrong tasks at month edges. Add `timezoneOffset` to `getByDateInputSchema` and shift boundaries the same way `journal.service.ts:94-103` does.
  - **DST drift.** `new Date().getTimezoneOffset()` at `integrated-calendar:17` returns offset at _now_, not at the target month. Navigating across a DST transition shifts boundaries 1h. Compute offset at the target date instead, or use `dayjs/plugin/timezone` with the user's IANA zone.
  - **Duplicate offset compute.** Both `integrated-calendar:17` and `day-details-sheet:30` recompute. Extract `useTimezoneOffset(date?)` hook.
  - **Double month normalization.** `useCalendarStore` holds raw `monthIndex` (can exceed 0-11); `getMonth()` (`src/utils/calendar.utils.ts`) normalizes internally; `integrated-calendar:22-24` normalizes again to derive `year`. Move to `{ year, monthIndex }` in store or return both from `getMonth`.
  - **DayDetailsSheet spillover.** `tasks` prop = current `monthIndex` only. Clicking a spillover day (prev/next month cells in the grid) shows empty tasks even when tasks exist. Either fetch spillover ranges, restrict clicks to current month, or fetch by date in the sheet itself.
  - **Schema round-trip.** `getByDateInputSchema.monthIndex` is `z.string().optional()` then router does `Number(...)`. Change to `z.number().int().min(0).max(11).optional()` and drop the `.toString()` at `integrated-calendar:28`.
  - Not a bug: do **not** swap `new Date().getTimezoneOffset()` for `dayjs().utcOffset()` — opposite sign convention, would break backend math in `journal.service.ts:96`.

- [ ] Tasks: per-tab visibility toggles + in-page Settings tab `[ux]` `[measure]`. Add a Settings tab (or popover) inside `/tasks` exposing (a) the default-view picker — currently in `/settings` via `useUserPreferencesStore.defaultTasksView` — moved next to the surface it controls; (b) booleans `showListTab` / `showKanbanTab` / `showTableTab` / `showMatrixTab` persisted in `useUserPreferencesStore`, default all `true`. Hidden tabs disappear from `TabsList` in `src/app/(workspace)/tasks/page.tsx:46-51` but stay deep-linkable via `?view=`. Guard: at least one tab must remain visible; hiding the active one falls back to first remaining. Keep or proxy the `/settings` entry. i18n under `tasks.settings.*` in both locales.

- [ ] PostHog: track Tasks tab usage `[measure]`. Add events `tasks_view_changed { view, source: 'tab_click' | 'default' | 'url_param' }` fired from `handleViewChange` (`src/app/(workspace)/tasks/page.tsx:30-38`) and `tasks_view_loaded { view }` on mount with the resolved `activeView`. Tells us which of list/kanban/table/matrix to keep or cut after beta data lands. Add event rows to `docs/specs/posthog_integration.md` taxonomy table.

- [ ] Audit Objectives → mana → dashboard wiring `[audit]`. Confirm completing an Objective fires the `objective_completed` PostHog event with non-zero `mana_earned` and that the user's mana reserve and dashboard reflect it. Objective is the Goal-tracking pillar named in `MISSION.md`; if it doesn't drive the core loop, the central analytics question in `docs/specs/posthog_integration.md` can't be answered. No code change if everything works.

## Low Priority

- [ ] Security: rate limiter falls back to in-memory when Redis absent. In multi-replica production without Upstash, rate limits are per-instance and trivially bypassable. Consider hard-fail in `src/server/lib/rate-limiter.ts` when `NODE_ENV=production && !UPSTASH_REDIS_REST_URL`. Document Redis as prod-required in deploy guide.

- [ ] Security: pnpm audit — 2 moderate transitive vulns. @hono/node-server <1.19.13`(via`@prisma/dev`), `postcss <8.5.10`(via`next`). Not directly exploitable in app code paths. Pin via `pnpm.overrides` or wait for upstream dependency bumps.

## Backlog (post-validation)

Deferred until the core loop has been validated with real beta users. Specs for some of these already exist (Journaling at `docs/specs/journaling.md`); the rest are real ideas, just wrong-time.

- [ ] Combat redesign Phase 3 — "doesn't feel gamy" polish pass. Tester feedback that combat "doesn't feel gamy" is not a mechanics problem (dice were swapped out in 2A) but a vibes problem. Bundle of:
  - Combat animation polish — sprite movement, hit reactions, attack/cast windups, screen shake on crit.
  - Sound design — music loops per tier, ability cast SFX, hit/crit/defeat stingers, UI clicks. None exist today.
  - Lore/world touchpoints — flavor text on quest scene transitions, enemy bestiary entries, ambient story beats outside combat.
  - Character progression visibility outside combat — tier-up moments, stat-change reveals, equipment-on-character render (overlaps with "Render character with equipped items" loop item).
  - Retro/16-bit aesthetic consistency — push past `panelChrome` Tailwind shim toward real NES.css `nes-container`/`nes-btn`, or pick a different consistent pixel-art system. Requires replacing shadcn `Card`/`Dialog`/`Button` primitives on RPG views.
  - Herald-flavored heal Ability — deferred from beta combat catalog; revisit if users request a healing class option.

- [ ] Combat redesign — post-beta cleanup. Deferred items surfaced during Phase 2 implementation, not load-bearing for beta:
  - Tier 4 abilities for Inquisitor + Demon Hunter classes (both classes out of beta scope; no T4 abilities defined for any class).
  - Empirical balance data — current tuning backed only by fight-count tests, not playtest data. Run 10× T1/T2/T3 parity fights and log average duration; flag stat axes outside 3–5 turn band.
  - `ManaService.scrubManaPotions` auto-invocation — runtime scrub exists but is uncalled. Wire into `CharacterService.getCurrentClass` or one-off deploy script before any real user has `mana_potion` rows.
  - Non-catalog ability i18n + ES item flavor — `blinding_faith` / `disruption_storm` / `fireball` / `fragility_curse` / `lightning_burst` / `righteous_charge` / `templar_burst` / `temporal_prison` / `igneous_cut` / `shield_bash` still contain "dice" copy; ES item flavor at `es/translation.json:1383/1399/1427/1467` still mentions "dado". No live consumer, but stale.
  - AI selection unit test — Phase 2B asserts outcomes (mana drains, fallback fires) not ordering (cost-tier sort, HP-low filter). Add focused test for `executeEnemyMove` selection algorithm.
  - `CombatLogType` enum prune — legacy variants (`PLAYER_HITS` / `ENEMY_DEFENDS` / `PLAYER_DEFENDS` / `MANA_REGEN` / `PHASE_COMPLETE` / `STATUS_EXPIRED`) no longer have emitters but UI consumers reference them. Prune when combat-log UI gets its own pass.
  - `AbilityEffectType` enum semantics rename — Phase 2A reuses old enum members with new meanings (`POWER_MODIFIER` now `+N% ATK`, `THRESHOLD_MODIFIER` now `+N% DEF`, `NEGATE_HITS` now Protect/thorns, etc.). Rename to match Pokémon-formula vocabulary when test churn is cheap.
  - `EnemyTemplate.manaRegen` field removal — hardcoded `0` on every enemy after Phase 2A locked "no regen". Still consumed by `inventory/character-status.component.tsx`. Drop field + UI reference together.

- [ ] Conversation-type quests — dialog with branching choices and outcomes

- [ ] Multi-part quest arcs with recurring NPCs. Chained quests (A unlocks B unlocks C), shared characters across chapters. Extends conversation-type quests (single dialog → narrative threading). Schema: `Quest.parentQuestId String?` + completion-gate predicates. Habitica feedback: top creative-content request alongside team quests.

- [ ] Barrier encounters / class-gated objectives. Quest steps requiring specific ability tags (Mage burns ward, Warrior breaches door, Herald heals NPC) — forces party composition diversity. Blocked on guild parties shipping.

- [ ] Heavy-hitter scaling in party combat. When parties ship, prevent high-tier players one-shotting bosses (Habitica's biggest party gripe). Mitigate via per-player damage cap, level-scaled contribution, or share-of-final-blow reward split. Defer until party combat exists.

- [ ] Alternative cosmetic theme/reskin (non-fantasy). Solar-punk / sci-fi / minimalist toggle per user. Habitica feedback: fantasy locks out a chunk of audience. Asset cost is high — ship only if beta surfaces discovery friction from the fantasy framing.

- [ ] Veteran gold/resource sink. Once endgame players accumulate idle gold, add rare expensive sinks: guild buffs, cosmetic upgrades, quest unlocks, prestige tiers. Defer until retention long enough to surface the problem.

- [ ] Interest-tagged guild discovery (study group / ADHD / artists / language-learning / etc.). Tag guilds by theme so users find compatible communities — the gap left by Habitica killing public guilds in 2023. Folds into Guild Phase 4 discovery work — pair tagging with search/filter UI.

- [ ] Google Calendar (and iCal) sync. Two-way sync of scheduled tasks/dailies. Habitica feedback: most-requested integration. Deferrable — internal calendar view (Medium) covers the primary use case first.
- [ ] AI report of the month — monthly AI-generated summary of productivity, streaks, objective progress
- [ ] Map page interactivity — clickable regions, faction war state, quest entry points
- [ ] Email change flow
- [ ] Account deletion: pre-delete data export prompt (folds into "Account management" data export)
- [ ] Breadcrumbs on nested routes (`/quests/[questId]`, `/inventory/[tab]`)
- [ ] Post-combat summary screen — XP/gold/loot between combat end and `/quests` redirect
- [ ] Theme system: OS-preference option (light/dark already exist)

- [ ] **Abandon-quest feature.** Add a UI affordance to abandon an active quest mid-run (currently quests only end on victory or defeat). Fires `combat_finished { outcome: 'abandoned' }` and unlocks the `abandoned` enum value reserved in the PostHog event taxonomy. See `docs/specs/posthog_integration.md` event table.

- [ ] **Evaluate `@posthog/next` once stable.** PostHog ships a unified Next.js package (bundles `PostHogProvider`, `PostHogPageView`, middleware-based reverse proxy at `/ingest`, server-side flag bootstrapping, and synchronized client/server identity). Currently pre-release — PostHog explicitly recommends the manual `posthog-js` + `posthog-node` setup for production. When the package leaves pre-release, revisit and decide whether to migrate. Likely replaces `src/lib/posthog/client.ts`, `src/components/common/posthog-provider.component.tsx`, and the planned manual proxy work. See `docs/specs/posthog_integration.md` "Out of Scope".

- [ ] **Reverse proxy `/ingest`.** Mirror the Sentry `/monitoring` tunnel pattern (`next.config.ts:72`) to bypass ad-blockers. Defer until ad-blocker drop rate is measurable (compare client `$pageview` count vs. server `task_completed` over a week post-launch).

- [ ] **Session replay.** Post-beta, with a dedicated PII-masking pass (mask all inputs, disable on `/sign-in`, `/sign-up`, `/settings`).

- [ ] **Local feature-flag evaluation.** Add `POSTHOG_PERSONAL_API_KEY` and enable in-memory flag polling in `posthog-node` if per-request flag latency or HTTP volume becomes a concern.
