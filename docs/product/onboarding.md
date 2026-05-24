# Onboarding

> **Status:** Implemented
> **Last Updated:** 2026-05-24
> **Supersedes:** `docs/product/tutorial_dialog.md` (the old 4-slide upfront carousel — Dice/Combat/Tier/Gear keyed on `Character.tutorialCompletedAt`). That doc describes pre-rework behavior and is retained for history; this doc is the source of truth.

## Overview

Onboarding is built around two coupled surfaces:

1. A **contextual tutorial slide queue** (`useTutorialStore` + `TutorialDialog`) — slides fire on first contact with each surface, not as an upfront carousel.
2. A **First Quest checklist** widget on `/objectives` — 5 steps that auto-tick on real user actions, dismissable, persists on `Character.onboardingProgress`.

The flow assumes hard-gated email verification and a mandatory class-pick + magic-nature quiz. There is no seed content; empty-state copy carries the weight on every productivity surface.

The activation KPI is `loop_closed` — fires once per user when the user has earned mana from a task/habit **and** started a quest. The event is defined in `docs/specs/posthog_integration.md` but is not wired yet (PostHog integration is itself deferred); the `Character.onboardingProgress` blob already carries the data needed for the guard.

## End-to-end flow

```
landing → /sign-up → email verify (hard gate)
       → /objectives?tutorial=true
              │
              ├─ character missing → enqueue ['character'] slide
              │       slide CTA → router.push('/onboarding')
              │
              └─ character exists → enqueue unseen subset of ['mana','combat','gear']
                       (filtered against User.tutorialSlidesSeen)

/onboarding (class pick + Void/Form magic-nature quiz)
       └─ createCharacter onSuccess → router.push('/objectives?tutorial=true')

/objectives — FirstQuestChecklist visible (above objective list)
       │
       ├─ Mana slide fires once (useTutorialTrigger('mana'))
       ├─ Step 1: Create habit  → /habits → tick habitCreated
       ├─ Step 2: Create task   → /tasks  → tick taskCreated
       ├─ Step 3: Earn mana     → first mana grant → tick manaEarned
       ├─ Step 4: Start quest   → /quests → click quest card
       │                                   ├─ Combat slide fires once
       │                                   └─ on quest.start → tick questStarted
       └─ Step 5: Equip gear    → /inventory
                                   ├─ Gear slide fires once
                                   └─ on equipItem → tick gearEquipped

All 5 ticked → checklist self-hides.
User clicks "Skip onboarding" → onboardingProgress.dismissedAt set → checklist self-hides.
User Menu → "Show first quest" → reopen mutation clears dismissedAt → checklist re-renders.
```

## First Quest checklist

**File:** `src/app/(workspace)/objectives/_components/first-quest-checklist.component.tsx`

5 steps, each backed by a flag on `Character.onboardingProgress`:

| Step key       | Title                          | CTA target   | Auto-tick site                                                  |
| -------------- | ------------------------------ | ------------ | --------------------------------------------------------------- |
| `habitCreated` | Create your first habit        | `/habits`    | `habit.service.ts` `create`                                     |
| `taskCreated`  | Create your first task         | `/tasks`     | `task.service.ts` `create`                                      |
| `manaEarned`   | Earn your first mana           | (no CTA)     | `mana.service.ts` `addManaFromCompletion(s)` (`tickManaEarned`) |
| `questStarted` | Spend mana on a quest          | `/quests`    | `quest.service.ts` `startQuest` (after `updateTacticalState`)   |
| `gearEquipped` | Equip your first piece of gear | `/inventory` | `character.service.ts` `equipItem` (after loadout write)        |

Render rules:

- Mounted at the top of `/objectives` (above the area+objective grid).
- Hides when `onboardingProgress.dismissedAt` is set OR all five flags are true.
- Collapsible via the chevron in the header — state stored as `onboardingProgress.collapsed`. Optimistic `setQueryData` so the chevron toggles instantly; rolls back via `onError` invalidate.
- "Skip onboarding" link calls `character.dismissOnboarding` — sets `dismissedAt = ISO string`. No confirmation modal.

**Auto-tick semantics.** Each service hook is wrapped in a try/catch and logs via `log.warn` on failure (`onboarding tick failed: <key>`). The tick is best-effort: a failed flag write never aborts the underlying action (habit create, mana grant, quest start, equip). The mana, quest, and equip hooks short-circuit when the flag is already set on the already-loaded `Character.onboardingProgress` so the hot path stays one UPDATE instead of two (see `Mana hot path` below).

**Atomic write.** `CharacterRepository.updateOnboardingProgress` uses raw SQL `UPDATE "characters" SET "onboardingProgress" = COALESCE("onboardingProgress", '{}'::jsonb) || $patch::jsonb WHERE … IS DISTINCT FROM …`. Single statement: atomic merge + no-op short-circuit when the patch matches existing state. Solves the lost-update race between concurrent ticks (e.g. simultaneous task complete + quest start) that read-modify-write would otherwise drop.

**Cache invalidation.** Habit/task/quest create call sites all invalidate `trpcOptions.character.getCurrentClass.queryKey()` in `onSuccess` (see `create-habit-dialog.component.tsx`, `create-task-dialog.component.tsx`, `quests/page.tsx`). The mana grant rides on the existing `invalidators.habits()` / `invalidators.tasks()` invalidation paths. Without these the checklist reads stale cached `onboardingProgress` and stays at 0/5 even after a real tick lands in the DB.

## Tutorial slide queue

**Files:** `src/components/tutorial/tutorial-dialog.component.tsx`, `src/stores/tutorial.store.ts`, `src/hooks/use-tutorial-trigger.ts`.

The original 4-slide upfront carousel (Mana / Combat / Tier / Gear) is replaced by a per-slide queue. Each slide is shown at most once per user and is fired by the surface it teaches.

**Slide set:** `['character', 'mana', 'combat', 'gear']` (declared as `TUTORIAL_SLIDE_IDS` in `src/shared/schemas/onboarding.schemas.ts`). The Tier slide is dropped; the one-line tier mention is folded into the Combat slide body (`"Win quests → climb tiers → unlock harder content"`).

| Slide       | Fired by                                                        | Icon (`pixelarticons`) |
| ----------- | --------------------------------------------------------------- | ---------------------- |
| `character` | `(workspace)/layout.tsx` when `?tutorial=true` AND no character | `HumanArmsUp`          |
| `mana`      | `useTutorialTrigger('mana')` on `/objectives`                   | `Gamepad`              |
| `combat`    | `enqueueIfUnseen('combat')` on first quest-card click           | `Sword`                |
| `gear`      | `useTutorialTrigger('gear')` on `/inventory`                    | `Shield`               |

**Queue mechanics (`useTutorialStore`):**

- `queue: TutorialSlideId[]` — the FIFO of slides to show.
- `seen: TutorialSlideId[]` — hydrated from `User.tutorialSlidesSeen` on character load.
- `hydrated: boolean` — gate so triggers don't fire before `seen` is loaded.
- `enqueueIfUnseen(id)` — used by `useTutorialTrigger`. Adds to queue only when `hydrated`, not already in `seen`, and queue is empty (prevents stacking).
- `enqueueMany(ids)` — used by the `?tutorial=true` handler. Filters against `seen` before enqueuing — so a returning user visiting with the tutorial param doesn't replay slides they've already dismissed.
- `closeCurrent()` — shifts the queue; clears `sessionTotal` when queue empties.
- `replayAll()` — clears `seen` locally + repopulates queue with `['mana','combat','gear']` (no character slide — replay assumes character exists). Wired from User Menu → "Replay tutorial".

**Dialog (`TutorialDialog`):**

- Open state is **derived** from `slide !== null`. No `setState` in `useEffect`.
- Per-slide CTA label override (used for the `character` slide which says "Continue", not "Got it").
- Multi-slide queues render dot indicators (top-right) — single-slide replays don't.
- Close handler: persists the seen slide via `markTutorialSlideSeen` mutation, advances the queue, and — if the closed slide was `character` and the user still has no character — `router.push('/onboarding')`.

**Character-slide redirect.** This handles a real flow gap: signup callback puts a freshly-verified user on `/objectives?tutorial=true` *before* class-pick. Without this slide the user lands on a silent empty workspace (no character → no checklist, no default areas, no default statuses). The character slide explicitly hands them off to `/onboarding` with copy framing class-pick as part of the loop. After `createCharacter` succeeds, `/onboarding` redirects back to `/objectives?tutorial=true`, and the remaining 3 slides enqueue.

## Mana hot path

`mana.service.ts` runs on every task / habit / objective / journal completion — it's the highest-frequency tick site by orders of magnitude. The hot path is guarded:

```ts
if (amount > 0) await this.tickManaEarned(userId, character.onboardingProgress)
```

`tickManaEarned` short-circuits when `progress.manaEarned === true` so steady-state grants never hit the DB. On the rare cold path (first grant of the user's lifetime), the atomic SQL update fires once. Failures are caught and logged via `log.warn` — never propagated to the user-visible reward grant.

`character.service.ts equipItem` and `quest.service.ts startQuest` apply the same pattern using the already-loaded character object.

## Schema

```prisma
model User {
  …
  tutorialSlidesSeen Json? @default("[]")   // string[] of slide IDs (TUTORIAL_SLIDE_IDS)
  …
}

model Character {
  …
  onboardingProgress Json? @default("{}")   // OnboardingProgress (see below)
  …
  @@map("characters")
}
```

`onboardingProgress` shape (`src/shared/schemas/onboarding.schemas.ts`):

```ts
{
  habitCreated?: boolean
  taskCreated?: boolean
  manaEarned?: boolean
  questStarted?: boolean
  gearEquipped?: boolean
  dismissedAt?: string   // ISO datetime
  collapsed?: boolean
}
```

Validation: `onboardingProgressSchema` (read shape) + `updateOnboardingProgressSchema` (write shape, excludes `dismissedAt` — only the dedicated `dismissOnboarding` mutation sets it).

`tutorialSlidesSeen` is a plain `TutorialSlideId[]` (`'character' | 'mana' | 'combat' | 'gear'`).

> **Why `tutorialSlidesSeen` lives on `User` and not `Character`.** The original spec (`docs/specs/onboarding.md` §1) said "Replace `tutorialCompletedAt` → `tutorialSlidesSeen Json?`" under "Extend `Character`". `tutorialCompletedAt` already lived on `User`, not `Character` — min-disruption interpretation kept the field on `User` so the existing read path through `getCurrentClass.user.tutorialSlidesSeen` and the existing `UserRepository.setTutorialSlidesSeen` setter survive intact. Documented in `docs/specs/onboarding-implementation.md`.

Schema migration is **additive only** — no destructive change, `pnpm db:push` is sufficient.

## tRPC procedures (`character` router)

| Procedure                  | Purpose                                                      |
| -------------------------- | ------------------------------------------------------------ |
| `getCurrentClass`          | Returns `tutorialSlidesSeen` + `onboardingProgress` on the character |
| `markTutorialSlideSeen`    | Append a slide ID to `User.tutorialSlidesSeen` (idempotent)  |
| `resetTutorialSlides`      | Clear `User.tutorialSlidesSeen` (drives the "Replay" menu)   |
| `updateOnboardingProgress` | Merge a partial patch into `Character.onboardingProgress`    |
| `dismissOnboarding`        | Set `onboardingProgress.dismissedAt = now()`                 |
| `reopenOnboarding`         | Clear `dismissedAt` (User Menu → "Show first quest")         |

All procedures are `protectedProcedure` + `rateLimit(RATE_LIMITS.write)`.

## Replay / reopen UX

User Menu (`src/components/common/user-menu.component.tsx`) exposes two entry points:

- **Replay tutorial** — visible always. Calls `character.resetTutorialSlides`, then `useTutorialStore.replayAll()` enqueues `['mana','combat','gear']` (no character slide).
- **Show first quest** — visible only when `onboardingProgress.dismissedAt` is set. Calls `character.reopenOnboarding` which clears `dismissedAt`; checklist re-renders on the next invalidate.

## Empty-state copy

Spec §3 strings live as i18n keys, not separate components — the shared `EmptyState` component already renders them across every productivity surface.

| Surface       | i18n key                            | Notes                                                |
| ------------- | ----------------------------------- | ---------------------------------------------------- |
| `/tasks`      | `tasks.empty_state.list.description` | Default list view. Other variants keep richer copy.  |
| `/habits`     | `habits.empty_state.description`    |                                                      |
| `/objectives` | `objectives.empty.description`      |                                                      |
| `/quests`     | `quests.subtitle`                   | Always-visible page subtitle; no empty state because quest templates are static. |

Both `public/locales/en/translation.json` and `public/locales/es/translation.json` carry every key.

## Files

**Created:**

- `src/app/(workspace)/objectives/_components/first-quest-checklist.component.tsx`
- `src/hooks/use-tutorial-trigger.ts`
- `src/shared/schemas/onboarding.schemas.ts`
- `docs/specs/onboarding.md`, `docs/specs/onboarding-implementation.md`, `docs/specs/onboarding.original.md`

**Modified (key surface):**

- `prisma/schema.prisma` — `Character.onboardingProgress`, `User.tutorialSlidesSeen` (replaces `tutorialCompletedAt`)
- `src/components/tutorial/tutorial-dialog.component.tsx` — per-slide props (`slide`, `current`, `total`, `ctaLabel`)
- `src/stores/tutorial.store.ts` — queue-based store
- `src/app/(workspace)/layout.tsx` — `?tutorial=true` handler, character-slide redirect, slide queue plumbing
- `src/app/(auth)/onboarding/page.tsx` — `onSuccess` redirects to `/objectives?tutorial=true`
- `src/app/(workspace)/{inventory,objectives,quests}/page.tsx` — per-surface `useTutorialTrigger` / `enqueueIfUnseen` calls
- `src/app/(workspace)/{habits,tasks}/_components/create-*-dialog.component.tsx` — `character.getCurrentClass` invalidation on create
- `src/server/services/character.service.ts` — `markTutorialSlideSeen`, `resetTutorialSlides`, `updateOnboardingProgress`, `dismissOnboarding`, `reopenOnboarding`, gear tick in `equipItem`
- `src/server/services/{habit,task,quest,mana}.service.ts` — onboarding ticks
- `src/server/repositories/character.repository.ts` — atomic SQL `updateOnboardingProgress`
- `src/server/repositories/user.repository.ts` — `setTutorialSlidesSeen`, `getTutorialSlidesSeen`
- `src/server/routers/character.router.ts` — five new procedures
- `src/components/common/user-menu.component.tsx` — Replay + Reopen items
- `public/locales/{en,es}/translation.json` — all new keys + empty-state rewrites

## Deferred / out of scope

- **`loop_closed` activation event.** Defined in `docs/specs/posthog_integration.md`; not wired because PostHog infra itself is not yet implemented. When PostHog ships, the guard reads `Character.onboardingProgress` (`progress.manaEarned && progress.questStarted`) so no new schema is needed. Hook sites: `task.service.update` (DONE transition), `habit.service.createCompletion`, `quest.service.startQuest`. Idempotency via PostHog person property `loop_closed_at`.
- **D7 retention threshold validation** — `loop_closed` users vs. non-`loop_closed` users ≥ 2× D7. Cannot evaluate until PostHog lands. Spec lives at `docs/specs/onboarding.original.md` §"Success criteria".
- **Intent chip question, soft email-verify, post-quest Void/Form quiz move, rigged first quest, seeded sample tasks/habits, day-2 reminder email, mid-onboarding recovery, mobile responsiveness pass, A/B framing.** All deferred per `docs/specs/onboarding.original.md` §"Out of scope".

## Verification

Manual (full happy path, fresh user):

1. `pnpm db:push` (schema is additive — no migrate).
2. Incognito → sign up → verify email → hits `/objectives?tutorial=true`.
3. Character slide fires; CTA reads "Continue". Close → land on `/onboarding`.
4. Class pick + Void/Form quiz → submit. Redirects to `/objectives?tutorial=true`.
5. Mana slide fires once; checklist visible above objectives. Confirm 0/5.
6. Create a habit via `/habits` → checklist 1/5 (`habitCreated`).
7. Create a task via `/tasks` → checklist 2/5 (`taskCreated`).
8. Complete the habit or task → checklist 3/5 (`manaEarned`).
9. Open `/quests`, click a quest card → Combat slide fires once. Start the quest → checklist 4/5 (`questStarted`).
10. Open `/inventory` → Gear slide fires once. Equip Tier 1 gear (free) → checklist 5/5 (`gearEquipped`). Checklist self-hides.
11. Toggle locale to `es` in settings → all checklist + slide + empty-state copy renders in Spanish.
12. User Menu → "Replay tutorial" → Mana / Combat / Gear slides queue again (no Character slide). Click through; each `markTutorialSlideSeen` mutation succeeds.
13. From a fresh state, click "Skip onboarding" → checklist hides. User Menu now shows "Show first quest". Click it → checklist re-renders with prior progress.

Automated:

- `pnpm vitest run src/server/__tests__/services/character.service.test.ts` covers `markTutorialSlideSeen` idempotency, `resetTutorialSlides`, `updateOnboardingProgress`, `dismissOnboarding`.
- `pnpm lint && pnpm typecheck`.

Race-condition guard:

- Repository SQL `IS DISTINCT FROM` clause is the only thing standing between concurrent ticks (task complete + quest start within the same request batch) and a lost-update flag drop. Any future change must preserve this property.
