---
title: 'A Week in Covenant: Guilds, Quests, and a Security Overhaul'
date: 2026-05-11
author: Yifan
tags: [release-notes, security, features, infra]
---

# A Week in Covenant: Guilds, Quests, and a Security Overhaul

Two ideas ran through this week's work, and they're worth saying up front.

**Security improvements compound.** Hashing session tokens at rest is small on its own. So is account lockout. So is rate limiting. So is audit logging. Stacked together they shift the project's risk profile far enough that extending sessions from 7 to 30 days became a comfortable call — a month ago it would not have been.

**Refactors paid for the features.** The quest router cleanup (`d4e885a`) and the settings form unification (`0434c12`) did not add a single user-visible capability. They made everything next to them easier to change. Guilds and Journaling — the week's two biggest features — shipped faster because earlier weeks had refactors of their own paying off.

The rest of the post walks through the changes. Security first, because that is where the compound interest lives.

---

## 1. Authentication and IDOR, rebuilt

### Magic links → email + password

For the first few months Covenant used Better Auth's magic-link flow. A great way to skip writing a password form, and the wrong default for this product. A habit tracker that forces you into your inbox every time you want to log a habit is dead on arrival.

Two commits did the heavy lifting:

- `04bbda5 feat: switch authentication from magic-link to email + password`
- `72e69fc feat: replace magic-link auth with email+password, verification, and password reset`

The first landed the schema change and the primary login path. The second filled in the lifecycle: email verification on sign-up, password reset via signed token, and the UI flows for both. Net diff: roughly 6,000 lines moved around to delete the magic-link code, add the verification routes, and reshape onboarding.

Better Auth handles the hashing (argon2id) and token generation; I own email rendering and routing. The existing magic-link templates were repurposed into verification and reset templates so the visual identity stayed consistent.

### Lockout and rate limiting

Password login means password brute force. Two follow-ups closed the obvious holes:

- `7ec2057 feat: add account lockout for repeated failed sign-ins` — N failed attempts within a window locks the account. The counter is per-account, not per-IP, because IP-based locks are trivially bypassed and punish anyone behind a shared NAT.
- `e748e73 feat: add in-memory rate limiting to tRPC endpoints` — a process-local token bucket in front of the tRPC router. Intentionally in-memory: I'm still on a single Railway service, so a Redis hop would be more latency than security. When I scale horizontally I'll swap the implementation behind the same interface.

### Audit logging

- `d58dd90 feat: add audit logging for auth events`
- `f44e8f8 feat: migrate transactional email to brevo, add auth logging, and consolidate agent docs`

Every sign-in, sign-out, failed attempt, password change, and lockout now writes a structured audit row. The schema is intentionally narrow — actor, event type, ip, user agent, timestamp, metadata JSON — so I do not regret the shape later. Immediate use: incident response when the app opens up. Longer-term: a "recent activity" panel in account settings.

### Session tokens, hashed at rest

- `84c1f05 feat: hash session tokens at rest via prisma client extension`

The change I am most proud of this week. Better Auth stores session tokens in plaintext by default — the industry norm, still uncomfortable. A read-only database leak would hand an attacker live sessions. The fix is a Prisma client extension that transparently hashes tokens on write and looks them up by hash on read. Application code never knows the difference. The trade-off is that you cannot reverse-lookup a token from a row, which I have no need to do.

### Session expiration: 7 → 30 days

- `5efc494 feat: extend session expiration from 7 to 30 days`

A one-line change, but a deliberate one. With password auth, hashed tokens at rest, lockout, and audit logging in place, the security cost of a longer session is much lower than it was a week ago. The UX cost of a 7-day session is high — a productivity tool that logs you out every week is a productivity tool you abandon.

### Closing the IDOR holes

> `e127fbd security: harden IDOR protection across repositories and services`

IDOR — insecure direct object reference — is the bug where the server trusts the ID in the request without checking whether the caller is allowed to touch that ID. It's easy to introduce in tRPC apps, because the framework gives you typed parameters and a logged-in user and it's tempting to use the first without checking against the second.

I had a `UserScopedRepository` base class that was supposed to prevent exactly this, but the audit found three places where services were calling raw `findById` on entities they should have been scoping. Fixed all three, then walked every other repository to verify the pattern. Tests now assert that cross-user access throws.

If you build on tRPC and have not done a pass like this, do it this week. The bugs are not subtle but they are invisible until you look.

---

## 2. Guilds, phase 1

> `7dc71e0 feat: guilds phase 1 (#138)` — 49 files, +3,330 lines

Guilds are Covenant's social layer. A guild is a small group of players who share a forum, can see each other's progress at a coarse level, and (in later phases) will share quest objectives.

Phase 1 ships:

- Create, join, and leave with three roles: `OWNER`, `OFFICER`, `MEMBER`.
- Invites by link with optional max-use and expiration. Tokens are random 32-byte strings, base64url-encoded, looked up by hash.
- A grouped forum where posts thread by day so the feed stays readable in low-activity guilds.
- A member list with avatars, levels, and last-active timestamps.

The architecture is the standard four-layer split: router → service → repository → Prisma. The interesting wrinkle is the invite flow. The join page is unauthenticated so a logged-out user can preview the guild, but the `join` mutation requires auth. The page has to gracefully handle "you must sign in first" without losing the invite token. Solution: stash the token in the URL through the auth redirect.

Spec lives at `docs/specs/guild_system.md`.

---

## 3. Quests, plus the inevitable refactor

Two commits, six days apart:

- `8011f2d feat: quests (#136)` — the initial system.
- `d4e885a refactor: quest router` — the inevitable cleanup.

Quests turn goals into structured journeys. A quest is a tree of objectives with rewards (XP, gold, items) at each node. Completing a child rolls progress up to the parent.

The first commit shipped the data model and the basic router. The refactor split a 600-line router into a thin tRPC layer plus a `QuestService` that owns the rollup logic. This is the pattern the rest of the backend uses, and the quest router was the last hold-out. With the refactor done, quests are testable without standing up a tRPC context.

The landing page was realigned around quests in `129aa26` so the marketing copy actually matches the product.

---

## 4. Journaling with mood and dice rewards

> `c8f710f feat: add journaling system with mood calendar and dice rewards`

Daily journaling is the habit-tracker feature I have wanted since day one. What shipped:

- Markdown editor with auto-save.
- A mood selector (1–5 scale, with emoji) feeding a calendar heatmap.
- A dice roll on save: a small chance of a bonus reward to make the act of writing feel like an event.

The dice roll is deliberately stingy. The point of the reward is to celebrate showing up, not to grind for. If players ever start optimizing journaling for loot, the design has failed.

Spec at `docs/product/journaling.md`.

---

## 5. Combat UI, redesigned

> `6883155 feat: redesign combat UI with Pokémon-style arena layout and menu-driven action bar`

The previous combat screen was a side-scrolling experiment that never quite clicked. The new one is a fixed two-character arena (player left, monster right) with a menu-driven action bar at the bottom. Anyone who grew up on Game Boy RPGs will recognize the layout immediately.

Why this layout: it scales from mobile to desktop without a separate design pass, the available actions are obvious (no hunting for buttons), and it gives a stable canvas for future animations. Spec at `docs/product/combat_ui_pokemon-style.md`.

The combat sprite was optimized in `2a71b94` — a small change that knocked a meaningful chunk off the initial-load JS for that route.

---

## 6. Onboarding polish

Three threads converging on the same goal: make the first thirty seconds of the app feel intentional.

- `d88b185 feat: add onboarding tutorial dialog and character name editing` — walking through the app from a cold start, the gap between "create character" and "first action" felt brutal. Nothing on screen told a new player what to do next. The tutorial dialog covers the four core verbs (task, habit, objective, quest) with a single-screen overlay that can be dismissed at any time. Character name editing was a bug in disguise: the onboarding form let you set a name once and never change it, which was not intentional. It is now a normal field on the settings page.
- `68c7d8a feat: add empty state to objectives page`
- `a1946f9 feat: add RPG-themed empty states across tasks and habits views`

A blank list with no copy is the worst possible first impression. Every list view in the workspace now has an empty state that tells the user (a) what this section is for, (b) what to do first, and (c) a tonal nudge in the direction of "you are a hero on a quest." This is the kind of work that does not show up in feature lists but will matter on day one when the app opens.

Spec at `docs/product/tutorial_dialog.md`.

---

## 7. Settings, unified

> `0434c12 feat: unify settings form and add date format preference`

The settings page used to be three separate forms with three separate save buttons and three different validation patterns. It is now one form, one schema, one button. A `dateFormat` preference (ISO, US, EU) was added in the same pass, flowing through to every date display in the app via a single formatter helper.

---

## 8. Pixelarticons everywhere

> `66fe568 feat: pixelarticons (#137)` — 93 files

The icon library was swapped for [pixelarticons](https://pixelarticons.com/) across the entire workspace. The previous library was tonally inconsistent — some icons flat, some outlined, some with drop shadows. Pixelarticons gives a single visual language that matches the pixel-RPG identity of the rest of the product.

This was the longest-running open PR of the week because every icon import had to be reviewed by hand. Worth it.

---

## 9. Transactional email overhaul

Two commits:

- `f44e8f8 feat: migrate transactional email to brevo, add auth logging, and consolidate agent docs`
- `14a4900 feat: add locale-aware themed transactional emails with i18n support`

Email moved off the previous provider onto Brevo. The trigger was deliverability — test sends of magic-link emails were landing in spam often enough that the same problem would absolutely have bitten real users on launch day. Brevo's free tier covers the foreseeable volume comfortably.

The locale-aware templates render in the user's language (English or Spanish for now) using the same i18n keys as the app. One of those changes that's invisible until the first non-English user signs up and gets a welcome email in Spanish — and then it's delightful.

---

## 10. Plumbing

Everything else that landed this week and matters for the product to ship.

### Legal pages, footer, cookie banner

> `31ed265 feat: add legal pages, footer, cookie banner, and MDX table support`

The boring infrastructure of being a real product. A footer with the right links, a cookie banner that respects "do not track", privacy and terms pages rendered from MDX. The MDX runtime got first-class table support in the same commit because the legal pages needed tables.

### Sentry, scoped to production only

- `5f7c087 feat: integrate sentry for error monitoring and restructure docs`
- `adb4e0c fix: only use sentry in prod`

Sentry was added on May 8, then scoped to production two days later. The development environment was firing Sentry events on every hot-reload error, which is not useful and burns the free quota. The fix wraps the Sentry init in `if (process.env.NODE_ENV === 'production')` and short-circuits the SDK calls otherwise. Net diff: -1,082 lines, because the dev paths no longer needed the Sentry-aware error handling.

### CI, pre-push hook, Next.js bump, Railway TLS

- `2015fd6 chore: add ci pipeline, husky pre-push hook, and fix lint warnings` — every push now runs the same `pnpm install --frozen-lockfile && prisma generate && lint && tsc && build && test:run` chain that Railway runs on deploy. If a push lands, the Railway build will land. Local feedback loop matters more than CI feedback loop, so the same chain runs in a Husky `pre-push` hook.
- `088e135 chore: bump next.js from 16.1.4 to 16.2.6` — point release, no API changes, but it picks up a fix in the App Router that was causing intermittent 404s on dynamic routes during dev.
- `dd20080 fix: disable strict db ssl verification for railway prisma 7 compat` — Railway's managed Postgres uses a self-signed cert that Prisma 7 rejects by default. Set `sslmode=require` instead of `verify-full`. Acceptable here because the connection is over Railway's private network.

### A handful of bugfixes worth keeping

- `f45324e fix: remove invalid userId uuid cast in task reorder query` — Better Auth user IDs are `text`, not `uuid`. Casting `userId::uuid` in a raw SQL query throws `invalid input syntax for type uuid` and 500s the request. The fix removes the cast.
- `a5b0237 fix: use explicit dimensions in chart ResponsiveContainer` — Recharts' `ResponsiveContainer` measures its parent on mount, and if the parent is `display: none` (collapsed accordion, hidden tab) it measures zero and never recovers. Explicit dimensions sidestep the issue.
- `312efcb feat: add opengraph image for landing page` — link previews on Twitter, Slack, and Discord no longer look like a placeholder.
- `1b024e8 chore: delete cron route` — leftover from a feature I no longer ship. Removing it cut a non-trivial chunk of cold-start cost on the workspace bundle.

---

## What's next

- **Guilds phase 2**: shared quest objectives and a guild-level XP pool.
- **Notifications**: a real notification center, replacing the ad-hoc toast usage.
- **Mobile polish**: the new combat UI works on mobile, but a few legacy screens still do not.
- **A second language pass**: Spanish translation coverage is at ~85%, target is 100% for shipped features.

— Yifan
