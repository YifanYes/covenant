# TODOs

## Critical Priority

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

- [ ] Set up `privacy@covenantrpg.com` email forwarder before going public
  - Privacy + ToS MDX now reference this address. Without forwarder, GDPR-required data-subject requests bounce.
  - Configure on covenantrpg.com DNS provider (Cloudflare Email Routing, ImprovMX, Fastmail catch-all, etc.) → forward to your gmail.

## High Priority

- [ ] Guild system Phase 4 — community lore + roleplay surfaces. Player-authored creative layer on top of guild infra. Habit-tracker-with-RPG-skin product benefits especially: lore reframes chores as quests and is stickier than leaderboards (lore decay slow, leaderboards reset weekly). Stage to keep moderation surface bounded.
  - **Identity layer (ship-first)** — guild lore field (rich text, ~5000 char), officer-set `GuildMember.title` ("Quartermaster", "Scout"), guild emblem/banner from preset list. Pair with custom campaign names from parametric-campaigns proposal. Officer-gated, length-capped, soft-delete on report. Schema: extend `Guild` (`lore Text?`, `emblem String?`) + add `GuildMember.title`. No economy exposure, reversible by clearing field. ~2–3 days.
  - **Interactive RP layer (defer further)** — player-authored quests/encounters/NPC dialogue, free-form avatar uploads, RP-mode chat channel separate from forum. Blocked on moderation pipeline (no infra today for NSFW/harassment review) and on identity-layer retention signal.
  - Risks: T&S burden on solo maintainer, localization (user text doesn't translate — accept per-guild), empty-shell problem if guild critical mass missing — solve discovery/capacity first.
  - **Defer until** Phase 3 ships and beta cohort shows lore-field engagement signal.

- [ ] PostHog integration — absorbs feature flags + analytics
  - Single tool for product analytics + session replay + feature flags. Replaces three previously-separate items: standalone "feature flag" infra, roadmap _"Analytics implemented (GA + Mixpanel)"_, roadmap _"UTM parameters definidos por canal"_.
  - **Fix:** Add `posthog-js` (client) + `posthog-node` (server). Capture pageviews and key events (task completion, combat start/end, quest claim). Wire feature flags via `posthog.isFeatureEnabled()`. Capture UTM on landing.

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

- [ ] Define story decisions. Story branches are the tier-progression payoff in the core loop.

- [ ] SEO basics + press kit + 2-line pitch. No `sitemap.ts`, no `robots.txt`, no per-page OG tags (only root `metadataBase`). Roadmap Phase 3 also calls for press kit (screenshots, descripción, logo) and a tested 2-line pitch.

- [ ] Discord setup — server, roles, welcome bot, weekly update template. Roadmap Phase 3 infrastructure block (Discord servidor, roles configurados, bot de bienvenida, template para weekly update). Beta tester comms channel.

## Medium Priority

- [ ] Security: `/api/logs` endpoint has no auth, no rate limit, no payload size cap. Any client (authenticated or not) can POST arbitrary log payloads. Abuse vector: log-flood inflates Sentry/hosting bill and drowns signal in noise.
  - **Fix:** Add IP-based `checkRateLimit` call + zod `.max()` bounds on `message` and `context` fields in `clientLogSchema`.

- [ ] Security: Sentry `sendDefaultPii: true` ships user IP/email/headers to Sentry. Configured in `sentry.shared.config.ts:18`. Fine operationally (Sentry is SOC 2), but must be disclosed in privacy policy. Consider `beforeSend` scrubber to strip email, keeping only `userId`.

- [ ] Security: error messages leak resource existence. Multiple service files distinguish "not found" from "forbidden" in their error messages, leaking existence of records the caller doesn't own.
  - **Fix:** Use generic "Resource not found or access denied" messages.

- [ ] Combat: ability cast clobbers stale `currentClass.health`.
  - `combat.service.ts` `playerCastAbility` / `playerCastSelfBuffAbility` snapshot `currentClass.health` and `currentClass.mana` BEFORE the ability executes, then write the snapshot back paired with `newMana`. Any ability that mutates DB health (self-damage, lifesteal) gets overwritten with the stale value. Latent today because no current ability touches DB health, but the foot-gun lives on the core combat path.
  - **Fix:** Either re-fetch the class after `executeTacticalAbility` / `useSelfBuffAbility`, or split `characterRepository.updateHealth` into a dedicated `updateMana(classId, mana)` and only write the column we changed.

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

## Low Priority

- [ ] Security: journal HTML stored raw in DB, sanitized at render only. All 3 current render sites go through `<JournalContent>` + DOMPurify — safe today. Future surfaces (data export, email digest, mobile API) would expose raw stored HTML. Defense-in-depth: sanitize on write in `journal.service.ts:create` + `update` with same DOMPurify allowlist.

- [ ] Security: rate limiter falls back to in-memory when Redis absent. In multi-replica production without Upstash, rate limits are per-instance and trivially bypassable. Consider hard-fail in `src/server/lib/rate-limiter.ts` when `NODE_ENV=production && !UPSTASH_REDIS_REST_URL`. Document Redis as prod-required in deploy guide.

- [ ] Security: pnpm audit — 2 moderate transitive vulns. @hono/node-server <1.19.13`(via`@prisma/dev`), `postcss <8.5.10`(via`next`). Not directly exploitable in app code paths. Pin via `pnpm.overrides` or wait for upstream dependency bumps.

- [ ] Security: type safety — replace `as any` usages. Including the `inventory` / `loadout` JSON-field casts in `character.repository.ts:107-108` (replace with Zod-inferred types from `src/shared/schemas/`).

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
- [ ] AI report of the month — monthly AI-generated summary of productivity, streaks, objective progress
- [ ] Map page interactivity — clickable regions, faction war state, quest entry points
- [ ] Email change flow
- [ ] Account deletion: pre-delete data export prompt (folds into "Account management" data export)
- [ ] Breadcrumbs on nested routes (`/quests/[questId]`, `/inventory/[tab]`)
- [ ] Post-combat summary screen — XP/gold/loot between combat end and `/quests` redirect
- [ ] N+1 risk in `dashboard.service.ts:149-206` — triple-nested in-memory loop, refactor before user counts grow
- [ ] Theme system: OS-preference option (light/dark already exist)
