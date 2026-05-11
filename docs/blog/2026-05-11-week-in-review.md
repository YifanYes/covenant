---
title: 'A Week in Covenant: Guilds, Quests, and a Security Overhaul'
date: 2026-05-11
author: Yifan
tags: [release-notes, security, features, infra]
---

# A Week in Covenant: Guilds, Quests, and a Security Overhaul

The past seven days were the busiest stretch this project has seen. We shipped two major systems (Guilds and Quests), redesigned combat, rebuilt the entire authentication stack, and hardened the backend against a class of bugs that has been quietly nagging at me for weeks. This post walks through what changed and — more importantly — why.

If you only read one section, make it the security one. The features are fun, but the security work is what lets the features exist without keeping me up at night.

---

## 1. Authentication, rebuilt from the ground up

### Magic links → email + password

For the first few months Covenant used Better Auth's magic-link flow. It was a great way to get to a working login screen without writing a password form. It is also the wrong default for this product. Covenant is not open to users yet, but a habit tracker that forces you into your inbox every time you want to log a habit is dead on arrival, and I would rather not ship that.

So we ripped it out. Two commits did the heavy lifting:

- `04bbda5 feat: switch authentication from magic-link to email + password`
- `72e69fc feat: replace magic-link auth with email+password, verification, and password reset`

The first commit landed the schema change and primary login path. The second filled in the rest of the lifecycle: email verification on sign-up, password reset via signed token, and the UI flows for both. Net diff: roughly 6,000 lines moved around to delete the magic-link code, add the verification routes, and reshape the onboarding screens.

Better Auth handles the hashing (argon2id) and token generation; we own the email rendering and the routing. The existing magic-link templates were repurposed into verification and reset templates so the visual identity stayed consistent.

### Account lockout and rate limiting

Once you have password login, you also have password brute force. Two follow-ups closed the obvious holes:

- `7ec2057 feat: add account lockout for repeated failed sign-ins` — after N failed attempts within a window, the account is temporarily locked. The counter is per-account, not per-IP, because IP-based locks are trivially bypassed and punish anyone behind a shared NAT.
- `e748e73 feat: add in-memory rate limiting to tRPC endpoints` — a process-local token bucket sitting in front of the tRPC router. It is intentionally in-memory: we are still on a single Railway service, so a Redis hop would be more latency than security. When we scale horizontally we will swap the implementation behind the same interface.

Both ship with audit log entries, which leads to:

### Audit logging for auth events

- `d58dd90 feat: add audit logging for auth events`
- `f44e8f8 feat: migrate transactional email to brevo, add auth logging, and consolidate agent docs`

Every sign-in, sign-out, failed attempt, password change, and lockout now writes a structured audit row. The schema is intentionally narrow (actor, event type, ip, user agent, timestamp, metadata JSON) so I do not regret the shape later. The immediate use is incident response when the app opens up; the longer-term use is user-visible "recent activity" panels in account settings.

### Hashing session tokens at rest

- `84c1f05 feat: hash session tokens at rest via prisma client extension`

This is the change I am most proud of from the week. Better Auth stores session tokens in plaintext by default, which is the industry norm but still uncomfortable: a read-only database leak hands an attacker live sessions. We added a Prisma client extension that transparently hashes tokens on write and looks them up by hash on read. The application code never knows the difference. The trade-off is that you cannot reverse-lookup a token from a row, which we have no need to do.

### Session expiration: 7 → 30 days

- `5efc494 feat: extend session expiration from 7 to 30 days`

A one-line change, but a deliberate one. With password auth, hashed tokens at rest, lockout, and audit logging in place, the security cost of a longer session is much lower than it was a week ago. The UX cost of a 7-day session is high — a productivity tool that logs you out every week is a productivity tool you abandon. 30 days is the new default.

---

## 2. Closing the IDOR holes

> `e127fbd security: harden IDOR protection across repositories and services`

IDOR — insecure direct object reference — is the bug where the server trusts the ID in the request without checking whether the caller is allowed to touch that ID. It is the most common vulnerability in tRPC apps because the framework gives you typed parameters and a logged-in user, and it is very easy to use the first without checking against the second.

We had a `UserScopedRepository` base class that was supposed to prevent this, but the audit found three places where services were calling raw `findById` on entities they should have been scoping. Fixed all three, then went through every other repository to verify the pattern was consistent. Tests were updated to assert that cross-user access throws.

If you are building on tRPC and have not done a pass like this, do it this week. The bugs are not subtle but they are invisible until you look.

---

## 3. Guilds, phase 1

> `7dc71e0 feat: guilds phase 1 (#138)` — 49 files, +3,330 lines

Guilds are Covenant's social layer. A guild will be a small group of players who share a forum, can see each other's progress at a coarse level, and (in later phases) will share quest objectives.

Phase 1 ships:

- **Create / join / leave** with three roles: `OWNER`, `OFFICER`, `MEMBER`.
- **Invites by link**, with optional max-use and expiration. Tokens are random 32-byte strings, base64url-encoded, looked up by hash.
- **A grouped forum** — posts thread by day so the feed stays readable in low-activity guilds.
- **A member list** with avatars, levels, and last-active timestamps.

The architecture is the standard four-layer split (router → service → repository → Prisma). The interesting wrinkle is the invite flow: the join page is unauthenticated so a logged-out user can preview the guild, but the actual `join` mutation requires auth. This means the page has to gracefully handle "you must sign in first" without losing the invite token. We solved it by stashing the token in the URL through the auth redirect.

Spec is at `docs/specs/guild_system.md` if you want the detail.

---

## 4. Quests and the quest router refactor

Two commits, six days apart:

- `8011f2d feat: quests (#136)` — the initial system.
- `d4e885a refactor: quest router` — the inevitable cleanup.

Quests are how Covenant turns goals into structured journeys. A quest is a tree of objectives with rewards (XP, gold, items) at each node. Completing a child rolls progress up to the parent.

The first commit shipped the data model and the basic router. The refactor split a 600-line router into a thin tRPC layer plus a `QuestService` that owns the rollup logic. This is the pattern the rest of the backend uses (see AGENTS.md), and the quest router was the last hold-out. With the refactor done, quests are testable without standing up a tRPC context.

The landing page was also realigned around quests in `129aa26` — the marketing copy now actually matches the product.

---

## 5. Journaling with mood and dice rewards

> `c8f710f feat: add journaling system with mood calendar and dice rewards`

Daily journaling is the habit-tracker feature I have been wanting since day one. The implementation:

- Markdown editor with auto-save.
- A mood selector (1–5 scale, with emoji) that feeds a calendar heatmap.
- A dice roll on save: a small chance of a bonus reward to make the act of writing feel like an event.

The dice roll is deliberately stingy. The point of the reward is to celebrate the act of showing up, not to grind for. If players ever start optimizing journaling for loot, the design has failed.

Spec at `docs/product/journaling.md`.

---

## 6. Combat UI, Pokémon style

> `6883155 feat: redesign combat UI with Pokémon-style arena layout and menu-driven action bar`

The previous combat screen was a side-scrolling experiment that never quite clicked for me. The new one is a fixed two-character arena (player left, monster right) with a menu-driven action bar at the bottom. If you grew up on Game Boy RPGs, you will recognize the layout.

Why this layout: it scales from mobile to desktop without a separate design pass, it makes the available actions obvious (no hunting for buttons), and it gives us a stable canvas for future animations. Spec at `docs/product/combat_ui_pokemon-style.md`.

The combat sprite was also optimized in `2a71b94` — a small change that knocked a meaningful chunk off the initial-load JS for that route.

---

## 7. Onboarding tutorial and character name editing

> `d88b185 feat: add onboarding tutorial dialog and character name editing`

Walking through the app from a cold start, the gap between "create character" and "first action" felt brutal — nothing on screen told a new player what to do next. The tutorial dialog walks through the four core verbs (task, habit, objective, quest) with a single-screen overlay that can be dismissed at any time.

Character name editing was a bug in disguise: the onboarding form let you set a name once and never change it, which was not intentional. It is now a normal field on the settings page.

Spec at `docs/product/tutorial_dialog.md`.

---

## 8. Empty states, everywhere

Three commits in a row:

- `68c7d8a feat: add empty state to objectives page`
- `a1946f9 feat: add RPG-themed empty states across tasks and habits views`

A blank list with no copy is the worst possible first impression. Every list view in the workspace now has an empty state that tells the user (a) what this section is for, (b) what to do first, and (c) a tonal nudge in the direction of "you are a hero on a quest." The copy follows the tone guide in AGENTS.md.

This is the kind of work that does not show up in feature lists but will matter on day one when the app opens.

---

## 9. Settings, unified

> `0434c12 feat: unify settings form and add date format preference`

The settings page used to be three separate forms with three separate save buttons and three different validation patterns. It is now one form, one schema, one button. A `dateFormat` preference (ISO, US, EU) was added in the same pass, flowing through to every date display in the app via a single formatter helper.

---

## 10. Pixelarticons everywhere

> `66fe568 feat: pixelarticons (#137)` — 93 files

The icon library was swapped for [pixelarticons](https://pixelarticons.com/) across the entire workspace. The previous library was tonally inconsistent — some icons were flat, some were outlined, some had drop shadows. Pixelarticons gives a single visual language that matches the pixel-RPG identity of the rest of the product.

This was the longest-running open PR of the week because every icon import had to be reviewed by hand. Worth it.

---

## 11. Transactional email overhaul

Three commits:

- `f44e8f8 feat: migrate transactional email to brevo, add auth logging, and consolidate agent docs`
- `14a4900 feat: add locale-aware themed transactional emails with i18n support`

Transactional email was moved off the previous provider onto Brevo. The trigger was deliverability — test sends of magic-link emails were landing in spam often enough that the same problem would absolutely bite real users on launch day. Brevo's free tier covers the foreseeable volume comfortably.

The locale-aware templates render the email in the user's language (English or Spanish for now) using the same i18n keys as the app. This is one of those changes that will be invisible until the first non-English user signs up and gets their welcome email in Spanish, and then it will be delightful.

---

## 12. Legal, footer, cookie banner

> `31ed265 feat: add legal pages, footer, cookie banner, and MDX table support`

The boring infrastructure of being a real product. A footer with the right links, a cookie banner that respects "do not track", privacy and terms pages rendered from MDX. The MDX runtime got first-class table support in the same commit because the legal pages needed tables.

---

## 13. Sentry, scoped to production only

Two commits:

- `5f7c087 feat: integrate sentry for error monitoring and restructure docs`
- `adb4e0c fix: only use sentry in prod`

Sentry was added on May 8, then immediately scoped to production three days later. The development environment was firing Sentry events on every hot-reload error, which is not useful and burns the free quota. The fix wraps the Sentry init in `if (process.env.NODE_ENV === 'production')` and short-circuits the SDK calls otherwise. Net diff: -1,082 lines, because the dev paths no longer needed the Sentry-aware error handling.

---

## 14. Infrastructure: CI, pre-push hook, Next.js bump

- `2015fd6 chore: add ci pipeline, husky pre-push hook, and fix lint warnings` — every push now runs the same `pnpm install --frozen-lockfile && prisma generate && lint && tsc && build && test:run` chain that Railway runs on deploy. If a push lands, the Railway build will land. Local feedback loop matters more than CI feedback loop, so the same chain runs in a Husky `pre-push` hook.
- `088e135 chore: bump next.js from 16.1.4 to 16.2.6` — point release, no API changes, but it picks up a fix in the App Router that was causing intermittent 404s on dynamic routes during dev.
- `dd20080 fix: disable strict db ssl verification for railway prisma 7 compat` — Railway's managed Postgres uses a self-signed cert that Prisma 7 rejects by default. Set `sslmode=require` instead of `verify-full`. Acceptable here because the connection is over Railway's private network.

---

## 15. Small but worth noting

- `f45324e fix: remove invalid userId uuid cast in task reorder query` — Better Auth user IDs are `text`, not `uuid`. Casting `userId::uuid` in a raw SQL query throws `invalid input syntax for type uuid` and 500s the request. The fix removes the cast. Documented in AGENTS.md so this never happens again.
- `b0cf515 fix: replace any types with generic react-hook-form types in form selectors` — small but it unblocked the `no-explicit-any` lint rule from being turned on in CI.
- `a5b0237 fix: use explicit dimensions in chart ResponsiveContainer` — Recharts' `ResponsiveContainer` measures its parent on mount, and if the parent is `display: none` (collapsed accordion, hidden tab) it measures zero and never recovers. Explicit dimensions sidestep the issue.
- `312efcb feat: add opengraph image for landing page` — link previews on Twitter, Slack, and Discord no longer look like a placeholder.
- `1b024e8 chore: delete cron route` — the route was a leftover from a feature we no longer ship. Removing it cut a non-trivial chunk of cold-start cost on the workspace bundle.

---

## What I learned this week

Two things.

First, security work compounds. Hashing session tokens, then lockout, then rate limiting, then audit logging, then closing IDOR holes — none of these alone is a big change, but together they shift the project's risk profile to a place where I am comfortable extending session length to 30 days. A month ago I would not have been.

Second, the ratio of refactor commits to feature commits matters. The quest router refactor (`d4e885a`) and the settings form unification (`0434c12`) did not add a single user-visible capability, but they made the next round of work in those areas dramatically easier. The week's two biggest features (Guilds and Journaling) were faster to build because earlier weeks had refactors of their own paying off.

---

## What's next

- **Guilds phase 2**: shared quest objectives and a guild-level XP pool.
- **Notifications**: a real notification center, replacing the ad-hoc toast usage.
- **Mobile polish**: the new combat UI works on mobile, but a few of the legacy screens still do not.
- **A second language pass**: Spanish translation coverage is at ~85%, target is 100% for shipped features.

Thanks for reading. If you spot something in here that is wrong, broken, or just confusing, the issue tracker is open.

— Yifan
