# TODOs

## Critical Priority

- [ ] Legal pages — Terms of Service, Privacy Policy, Cookie consent
  - No `/tos`, `/privacy`, or consent banner exists. GDPR/CCPA exposure on EU/CA visitors. Required before public traffic.

- [ ] API rate limiting
  - Zero rate limiting in tRPC routers, middleware, or auth endpoints. No `@upstash/ratelimit` or redis. Magic-link and signup endpoints can be abused for spam/credential stuffing. Broader than the "Account Lockout" item below.
  - **Fix:** Add rate limiter middleware (per-IP + per-user) and apply to auth, magic-link send, and write-heavy routers.

- [ ] Email verification enforcement
  - `emailVerified` field exists in Better Auth but is never checked. Users can sign up with any email and access the full app. Beta will leak fake accounts and break magic-link recovery.
  - **Fix:** Gate protected routes on `emailVerified`; send verification email post-signup.

- [ ] Error monitoring (extends Observability item below)
  - No Sentry/Datadog. Production errors will be invisible. Pino logs locally but no remote sink.
  - **Fix:** Wire Sentry (or equivalent) for both server (tRPC error formatter) and client (React error boundaries).

## High Priority

- [ ] Simple feature flag
  - Enable controlled rollout of new features without redeployments

- [ ] Add Github and X OAuth

- [ ] PostHog integration
  - Product analytics + session replay + feature flags in a single tool. Generous free tier covers small-scale usage. Could subsume the "Simple feature flag" item above.
  - **Fix:** Add `posthog-js` (client) + `posthog-node` (server). Capture pageviews, key events (task completion, combat start/end, quest claim), and wire feature flags via `posthog.isFeatureEnabled()`.

- [ ] Fix npm warn Unknown project config "enable-pre-post-scripts". This will stop working in the next major version of npm.

- [ ] Guild system
  - Users can create their own guilds, invite their friends, and start guild-wide campaigns. Each guild has a social forum. There are exclusive rewards for guild members.

- [ ] Observability
  - Logging, metrics, and tracing for backend services and frontend errors

- [ ] Analyze if implementing [NES.css](https://nostalgic-css.github.io/NES.css/) in the RPG modules would improve the user experience

- [ ] Mobile responsiveness — combat & RPG layout
  - `combat-arena.component.tsx` uses fixed 12-col grid + `h-72`; `cart-panel.component.tsx` uses fixed `w-80`. Only ~23 responsive breakpoints across all workspace routes. Phone users cannot complete combat.

- [ ] Test coverage gaps for core gamification services
  - Missing tests: `habit.service.ts` (streaks + dice rewards), `objective.service.ts`, `area.service.ts`, `auth.service.ts`, `kill-record.service.ts`. CLAUDE.md flags habits + tier progression as critical paths.

- [ ] i18n: translate hardcoded strings in error pages
  - `src/app/error.tsx`, `src/app/not-found.tsx` have raw English ("Something went wrong!", "404 - Page Not Found", "Go to Dashboard"). Add to `en` + `es` locales.

- [ ] SEO basics
  - No `sitemap.ts`, no `robots.txt`, no per-page OG tags (only root `metadataBase`). Beta launch announcements will share unstyled link previews.

- [ ] Per-route error boundaries
  - Only root `error.tsx` exists. Add `error.tsx` to `(workspace)/quests/`, `(workspace)/tasks/`, `(workspace)/habits/`, `(workspace)/objectives/`, `(workspace)/shop/`, `(workspace)/inventory/`.

- [ ] Account management — profile, data export
  - Settings page covers email/language/theme/faction/logout/delete-account but lacks: profile name/character edit, GDPR-compliant data export.

- [ ] Email retry + throttling
  - `email.service.ts` is single-attempt with 5s timeout. Magic-link emails can be triggered repeatedly with no throttle (abuse vector + cost risk on Brevo).

- [ ] Security headers
  - `next.config.ts` has no CSP, HSTS, X-Frame-Options, or Permissions-Policy. No `middleware.ts` for global headers.

## Medium Priority

- [ ] Post-its board / card view in productivity section
  - Kanban-style card view as an alternative layout for tasks in the productivity area

- [ ] Journaling module
  - Daily/free-form journal entries linked to tasks, habits, and quests

- [ ] Security: Error Messages Leak Resource Existence
  - Multiple service files
  - **Fix:** Use generic "Resource not found or access denied" messages

- [ ] Conversation type quests: it's a dialog where you choose between different choices, each one has a different outcome.

- [ ] Empty states for remaining views
  - Already shipped for habits/tasks/objectives. Still missing: shop filtered results (no matches), inventory Armory + Doctrines tabs.

- [ ] Accessibility in combat
  - Combat grid sprites are styled `div`s with no `role="img"`, `aria-label`, or alt text. No keyboard navigation for tactical grid. ~30 aria attributes across 78 components (~38% coverage).

- [ ] Post-combat summary screen
  - Victory/defeat dialogs exist but no XP/gold/loot summary between combat end and `/quests` redirect.

- [ ] Better-typed JSON fields (`inventory`, `loadout`)
  - `character.repository.ts:107-108` casts to `any`. Replace with Zod-inferred types from `src/shared/schemas/`. Subset of "Type Safety Issues" below but specifically the JSON columns.

- [ ] 404 / invalid ID handling
  - Invalid quest/task IDs hit generic error boundary; no redirect to listing or "this quest doesn't exist" empty state.

- [ ] Breadcrumbs on nested routes
  - `/quests/[questId]`, `/inventory/[tab]` lack breadcrumbs.

- [ ] Logout button in sidebar
  - Currently buried in `/settings`. Add to user dropdown in sidebar.

- [ ] Toast / Sonner mobile placement
  - Default top-right covers mobile action buttons. Configure responsive position.

- [ ] Theme system option
  - Settings offers light/dark only; add `system` (matches OS).

## Low Priority

- [ ] Security: No Account Lockout
  - **Fix:** Implement exponential backoff on failed logins

- [ ] Security: Type Safety Issues
  - Multiple `as any` usages
  - **Fix:** Replace with proper types

- [ ] Combat: Duplicated Grid Logic
  - `tactical-combat.store.ts:1025-1040, 1453-1468, 156-180`
  - **Fix:** Extract to `shared/utils/grid.utils.ts`

- [ ] Combat: Magic Numbers
  - Various files with hardcoded dice values
  - **Fix:** Move to `shared/constants/combat-rules.ts`

- [ ] Combat: Race - Enemy Turn Guard
  - `use-tactical-enemy-turn.hook.ts:29-31`
  - **Fix:** Use state flag + ref together; debounce effect

- [ ] AI report of the month
  - Monthly AI-generated summary of user productivity, habit streaks, and progress toward objectives

- [ ] Combat: Race - Async State Access
  - `use-tactical-enemy-turn.hook.ts:34`
  - **Fix:** Refresh state after each await in critical paths

- [ ] Map page interactivity
  - `/map` is a static image + lore. No clickable regions, faction war state, or quest entry points.

- [ ] Account deletion: pre-delete data export prompt
  - Single-step delete with no offer to download data first.

- [ ] Email change flow
  - No way to change account email post-signup.

- [ ] N+1 risk in `dashboard.service.ts:149-206`
  - Triple-nested in-memory loops over areas → objectives → tasks. Currently in-memory after batch fetch, but worth refactoring before user counts grow.
