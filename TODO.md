# TODOs

> Tags: `[blocker]` legal/security/abuse · `[loop]` core validation hypothesis · `[retention]` keeps validated users · `[debt]` engineering hygiene
>
> Items in **Backlog (post-validation)** are not deleted — they're deferred until the core loop has been validated with real beta users. Re-evaluate based on retention/feedback signals.

## Critical Priority

- [ ] Onboarding tutorial — explain the core loop `[loop]`
  - Roadmap Phase 3: _"Introducción funcional: Explicación del loop y consecuencias (evitar lore pesado)"_. No in-app tutorial exists. Beta users will drop off if the dice → combat → tier → gear loop isn't immediately legible.

## High Priority

- [x] Guild system Phase 1 — guilds + members + invite-link + flat forum `[retention]`. Single-guild membership, role matrix (OWNER/OFFICER/MEMBER), shareable invite links, polled (7s) chat. Habitica's removal of guilds is a documented churn driver — Phase 1 ships the social retention surface.

- [ ] Guild system Phase 2 — guild campaigns `[retention]`. Shared progress goals (e.g. "guild collectively defeats N enemies"). New `GuildCampaign` + `GuildCampaignProgress` entities; hook into `kill-record.service.ts`. Spec to live at `docs/specs/guild_campaigns.md`.

- [ ] Guild system Phase 3 — exclusive rewards + progression bonuses `[retention]`. Guild-only items (`Item.guildExclusive` flag), guild-tier progression with member XP/gold modifiers. Touches store + character services. Defer until Phase 1+2 retention signal validated with beta cohort.

- [ ] PostHog integration — absorbs feature flags + analytics `[loop]`
  - Single tool for product analytics + session replay + feature flags. Replaces three previously-separate items: standalone "feature flag" infra, roadmap _"Analytics implemented (GA + Mixpanel)"_, roadmap _"UTM parameters definidos por canal"_.
  - **Fix:** Add `posthog-js` (client) + `posthog-node` (server). Capture pageviews and key events (task completion, combat start/end, quest claim). Wire feature flags via `posthog.isFeatureEnabled()`. Capture UTM on landing.

- [ ] Beta wipe tools `[loop]`
  - Roadmap Phase 3: _"Herramientas para resetear el progreso de usuarios beta"_ + _"Capacidad de rollback o wipe controlado ante fallos graves"_. Required for controlled beta iteration.

- [ ] Welcome email + email retry/throttle `[blocker]`
  - `EmailService` is single-attempt with 5s timeout. Verification + password-reset endpoints are rate-limited via Better Auth (3 req / 10s per IP on sign-up, 3 req / 60s on `/forget-password`), but there is no per-recipient cap and no welcome email. Abuse vector + Brevo cost risk if a single email is targeted from many IPs.
  - Also covers roadmap Phase 3: _"Email de bienvenida automatizado"_.

- [ ] Content Security Policy
  - `next.config.ts` now sets HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy (all delivered in the auth hardening pass). CSP was intentionally deferred — needs allowlist work for Next.js inline scripts, Google OAuth, and Sentry tunneling. Worth a dedicated pass.

- [ ] Account management — profile edit, data export `[blocker]`
  - Settings page covers email/language/theme/faction/logout/delete-account but lacks profile name/character edit and GDPR-compliant data export.

- [ ] Add Github OAuth `[loop]`

- [ ] Render character with equipped items `[loop]`. Visual feedback closes the gear loop — without it, equipping a sword feels invisible.

- [ ] Define story decisions `[loop]`. Story branches are the tier-progression payoff in the core loop.

- [ ] Per-route error boundaries `[loop]`
  - Only root `error.tsx` exists. Add `error.tsx` to `(workspace)/quests/`, `(workspace)/tasks/`, `(workspace)/habits/`, `(workspace)/objectives/`, `(workspace)/shop/`, `(workspace)/inventory/`.

- [ ] i18n: translate hardcoded strings in error pages `[blocker]`
  - `src/app/error.tsx`, `src/app/not-found.tsx` have raw English ("Something went wrong!", "404 - Page Not Found", "Go to Dashboard"). Add to `en` + `es` locales.

- [ ] SEO basics + press kit + 2-line pitch `[loop]`
  - No `sitemap.ts`, no `robots.txt`, no per-page OG tags (only root `metadataBase`). Roadmap Phase 3 also calls for press kit (screenshots, descripción, logo) and a tested 2-line pitch.

- [ ] Discord setup — server, roles, welcome bot, weekly update template `[loop]`
  - Roadmap Phase 3 infrastructure block (Discord servidor, roles configurados, bot de bienvenida, template para weekly update). Beta tester comms channel.

- [ ] Test coverage gaps for core gamification services `[debt]`
  - Missing tests: `habit.service.ts` (streaks + dice rewards), `objective.service.ts`, `area.service.ts`, `auth.service.ts`, `kill-record.service.ts`. CLAUDE.md flags habits + tier progression as critical paths.

  - [ ] Use [NES.css](https://nostalgic-css.github.io/NES.css/) or [RPGUI](https://ronenness.github.io/RPGUI/) for the RPG views.

## Medium Priority

- [ ] Security: error messages leak resource existence `[blocker]`
  - Multiple service files distinguish "not found" from "forbidden" in their error messages, leaking existence of records the caller doesn't own.
  - **Fix:** Use generic "Resource not found or access denied" messages.

- [ ] Combat: race condition — enemy turn guard `[blocker]`
  - `use-tactical-enemy-turn.hook.ts:29-31`. Bug in shipping code on the core loop.
  - **Fix:** Use state flag + ref together; debounce effect.

- [ ] Combat: race condition — async state access `[blocker]`
  - `use-tactical-enemy-turn.hook.ts:34`. Bug in shipping code on the core loop.
  - **Fix:** Refresh state after each await in critical paths.

- [ ] Combat: doctrine cast clobbers stale `currentClass.health` `[debt]`
  - `combat.service.ts` `playerCastDoctrine` / `playerCastSelfBuffDoctrine` snapshot `currentClass.health` and `currentClass.mana` BEFORE the doctrine executes, then write the snapshot back paired with `newMana`. Any doctrine that mutates DB health (self-damage, lifesteal) gets overwritten with the stale value. Latent today because no current doctrine touches DB health, but the foot-gun lives on the core combat path.
  - **Fix:** Either re-fetch the class after `executeTacticalDoctrine` / `useSelfBuffDoctrine`, or split `characterRepository.updateHealth` into a dedicated `updateMana(classId, mana)` and only write the column we changed.

- [ ] Empty states for remaining views `[loop]`
  - Already shipped for habits/tasks/objectives. Still missing: shop filtered results (no matches), inventory Armory + Doctrines tabs.

- [ ] Accessibility in combat `[loop]`
  - Combat grid sprites are styled `div`s with no `role="img"`, `aria-label`, or alt text. No keyboard navigation for tactical grid. ~30 aria attributes across 78 components (~38% coverage).

- [ ] 404 / invalid ID handling `[loop]`
  - Invalid quest/task IDs hit generic error boundary; no redirect to listing or "this doesn't exist" empty state.

- [ ] Logout button in sidebar `[loop]`
  - Currently buried in `/settings`. Add to user dropdown in sidebar.

- [ ] Re-enable strict TLS verification on prod database `[debt]`
  - `src/server/lib/prisma.ts` currently runs production with `ssl: { rejectUnauthorized: false }` (channel still encrypted, chain not validated). See `docs/specs/database_ssl.md`.
  - Blocked on either: a Prisma 7 fix for the `@prisma/adapter-pg` regression (prisma/prisma#29060, #27611) — strict verification rejects Railway's cert chain even with `sslmode=verify-full` — or Railway publishing a CA bundle for managed Postgres so we can pin via `ssl.ca`.
  - **Fix when unblocked:** flip `rejectUnauthorized` back to `true` (and add `ca: env.DATABASE_SSL_CA` if pinning); update `docs/specs/database_ssl.md`.

## Low Priority

- [ ] Security: type safety — replace `as any` usages `[debt]`
  - Including the `inventory` / `loadout` JSON-field casts in `character.repository.ts:107-108` (replace with Zod-inferred types from `src/shared/schemas/`).

## Backlog (post-validation)

Deferred until the core loop has been validated with real beta users. Specs for some of these already exist (Journaling at `docs/specs/journaling.md`); the rest are real ideas, just wrong-time.

- [ ] Conversation-type quests — dialog with branching choices and outcomes
- [ ] Post-its board / Kanban card view in productivity section
- [ ] AI report of the month — monthly AI-generated summary of productivity, streaks, objective progress
- [ ] Map page interactivity — clickable regions, faction war state, quest entry points
- [ ] Email change flow
- [ ] Account deletion: pre-delete data export prompt (folds into "Account management" data export)
- [ ] Breadcrumbs on nested routes (`/quests/[questId]`, `/inventory/[tab]`)
- [ ] Post-combat summary screen — XP/gold/loot between combat end and `/quests` redirect
- [ ] N+1 risk in `dashboard.service.ts:149-206` — triple-nested in-memory loop, refactor before user counts grow
- [ ] Theme system: OS-preference option (light/dark already exist)
