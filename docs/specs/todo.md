# TODOs

> Tags: `[blocker]` legal/security/abuse · `[loop]` core validation hypothesis · `[retention]` keeps validated users · `[debt]` engineering hygiene
>
> Items in **Backlog (post-validation)** are not deleted — they're deferred until the core loop has been validated with real beta users. Re-evaluate based on retention/feedback signals.

## Critical Priority

- [ ] Legal pages — Terms of Service, Privacy Policy, Cookie consent `[blocker]`
  - No `/tos`, `/privacy`, or consent banner exists. GDPR/CCPA exposure on EU/CA visitors. Required before public traffic.

- [ ] Account lockout — exponential backoff on failed logins `[blocker]`
  - Email+password auth has no per-account failed-login throttling. Brute-force vector against any single account even with the global rate limit (3 sign-ins/10s/IP) in place — an attacker rotating IPs avoids the cap.
  - **Fix:** track failed attempts per account in Redis; lock after N failures with exponential backoff; reset on successful login or password reset.

- [ ] Onboarding tutorial — explain the core loop `[loop]`
  - Roadmap Phase 3: _"Introducción funcional: Explicación del loop y consecuencias (evitar lore pesado)"_. No in-app tutorial exists. Beta users will drop off if the dice → combat → tier → gear loop isn't immediately legible.

## High Priority

- [ ] Guild system `[retention]`
  - Users create their own guilds, invite friends, run guild-wide campaigns. Each guild has a social forum. Exclusive guild rewards.
  - **Why high despite `mvp_scope_cut.md` cutting forum+factions:** Habitica's removal of guilds is documented as a major churn driver. Social retention is a non-negotiable companion hypothesis to the solo loop.

- [ ] PostHog integration — absorbs feature flags + analytics `[loop]`
  - Single tool for product analytics + session replay + feature flags. Replaces three previously-separate items: standalone "feature flag" infra, roadmap _"Analytics implemented (GA + Mixpanel)"_, roadmap _"UTM parameters definidos por canal"_.
  - **Fix:** Add `posthog-js` (client) + `posthog-node` (server). Capture pageviews and key events (task completion, combat start/end, quest claim). Wire feature flags via `posthog.isFeatureEnabled()`. Capture UTM on landing.

- [ ] Journaling MVP — daily entries with mood tracking and calendar view `[loop]`
  - Validation experiment before building the full module. Spec: `docs/specs/journaling.md`
  - **In scope:** plain-text entries, 12 moods, 5 random prompts, monthly mood calendar, 1 dice/day, streak display
  - **Out of scope:** reviews, time capsule, mood mosaic, habit calendar, markdown editor, search, streak bonuses
  - **Success criteria:** 30% activation, 25% 7-day retention, 40% mood adoption
  - **Instrumentation:** log `journaling_nav_clicked`, `journal_entry_created`, `mood_selected`, `prompt_requested`, `calendar_viewed`, `calendar_day_clicked`

- [ ] Beta wipe tools `[loop]`
  - Roadmap Phase 3: _"Herramientas para resetear el progreso de usuarios beta"_ + _"Capacidad de rollback o wipe controlado ante fallos graves"_. Required for controlled beta iteration.

- [ ] Welcome email + email retry/throttle `[blocker]`
  - `EmailService` is single-attempt with 5s timeout. Verification + password-reset endpoints are rate-limited via Better Auth (3 req / 10s per IP on sign-up, 3 req / 60s on `/forget-password`), but there is no per-recipient cap and no welcome email. Abuse vector + Brevo cost risk if a single email is targeted from many IPs.
  - Also covers roadmap Phase 3: _"Email de bienvenida automatizado"_.

- [ ] Content Security Policy
  - `next.config.ts` now sets HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy (all delivered in the auth hardening pass). CSP was intentionally deferred — needs allowlist work for Next.js inline scripts, Google OAuth, and Sentry tunneling. Worth a dedicated pass.

- [ ] Account management — profile edit, data export `[blocker]`
  - Settings page covers email/language/theme/faction/logout/delete-account but lacks profile name/character edit and GDPR-compliant data export.

- [ ] Add Github and X OAuth `[loop]`

- [ ] Render character with equipped items `[loop]`
  - Roadmap Phase 2 still pending: _"Renderizar el personaje con los items equipados"_. Visual feedback closes the gear loop — without it, equipping a sword feels invisible.

- [ ] Define story decisions `[loop]`
  - Roadmap Phase 2 pending: _"Definir decisiones de la historia"_. Story branches are the tier-progression payoff in the core loop.

- [ ] Per-route error boundaries `[loop]`
  - Only root `error.tsx` exists. Add `error.tsx` to `(workspace)/quests/`, `(workspace)/tasks/`, `(workspace)/habits/`, `(workspace)/objectives/`, `(workspace)/shop/`, `(workspace)/inventory/`.

- [ ] i18n: translate hardcoded strings in error pages `[blocker]`
  - `src/app/error.tsx`, `src/app/not-found.tsx` have raw English ("Something went wrong!", "404 - Page Not Found", "Go to Dashboard"). Add to `en` + `es` locales.

- [ ] SEO basics + press kit + 2-line pitch `[loop]`
  - No `sitemap.ts`, no `robots.txt`, no per-page OG tags (only root `metadataBase`). Roadmap Phase 3 also calls for press kit (screenshots, descripción, logo) and a tested 2-line pitch.

- [ ] Discord setup — server, roles, welcome bot, weekly update template `[loop]`
  - Roadmap Phase 3 infrastructure block (Discord servidor, roles configurados, bot de bienvenida, template para weekly update). Beta tester comms channel.

- [ ] Refactor `/src/server/routers/quest.router.ts` to layered architecture `[debt]`
  - Currently bypasses the service/repository layers used by the rest of the backend.

- [ ] Test coverage gaps for core gamification services `[debt]`
  - Missing tests: `habit.service.ts` (streaks + dice rewards), `objective.service.ts`, `area.service.ts`, `auth.service.ts`, `kill-record.service.ts`. CLAUDE.md flags habits + tier progression as critical paths.

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

- [ ] Empty states for remaining views `[loop]`
  - Already shipped for habits/tasks/objectives. Still missing: shop filtered results (no matches), inventory Armory + Doctrines tabs.

- [ ] Accessibility in combat `[loop]`
  - Combat grid sprites are styled `div`s with no `role="img"`, `aria-label`, or alt text. No keyboard navigation for tactical grid. ~30 aria attributes across 78 components (~38% coverage).

- [ ] 404 / invalid ID handling `[loop]`
  - Invalid quest/task IDs hit generic error boundary; no redirect to listing or "this doesn't exist" empty state.

- [ ] Logout button in sidebar `[loop]`
  - Currently buried in `/settings`. Add to user dropdown in sidebar.

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

## Removed

Deleted from the active and backlog lists with rationale:

- ~~Mobile responsiveness — combat & RPG layout~~ — target user base is not on mobile
- ~~Toast / Sonner mobile placement~~ — same reason as above
- ~~Error monitoring (Sentry)~~ — implemented (`sentry.shared.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, `instrumentation-client.ts`)
- ~~Fix npm warn `enable-pre-post-scripts`~~ — cosmetic warning, no user impact
- ~~Analyze if implementing NES.css~~ — `DESIGN.md` already prescribes the NES.css + Tailwind approach; this is decided, not exploratory
- ~~Combat: Duplicated Grid Logic~~ — pure refactor, no user signal
- ~~Combat: Magic Numbers~~ — pure refactor, no user signal
- ~~Analyze game design loop~~ — `docs/specs/mvp_scope_cut.md` is the output of this analysis. If something more specific is meant (empirical playtest, dice economy rebalance, story-branch design), it should be filed as that specific task
- ~~Email verification enforcement~~ — delivered in the auth hardening pass; `requireEmailVerification: true` + `sendVerificationEmail` callback wired in `src/server/lib/auth.ts`, sign-up page now shows the "check your email" state. See `docs/specs/auth.md` § Hardening follow-up.
- ~~Security headers (HSTS / X-Frame-Options / X-Content-Type-Options / Referrer-Policy / Permissions-Policy)~~ — delivered in the auth hardening pass via `next.config.ts` `headers()`. CSP remains an open follow-up (split out as its own item above).
- ~~Distributed rate limiting~~ — delivered in the auth hardening pass; both Better Auth's `secondaryStorage` and the tRPC limiter use Upstash Redis when configured, with in-memory fallback for dev/test.
- ~~Password reset flow~~ — delivered in the auth hardening pass; `/forgot-password` and `/reset-password` pages, `sendResetPassword` callback, locale-aware Brevo email.
