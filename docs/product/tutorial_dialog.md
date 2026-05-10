# Tutorial Dialog Specification

## Overview

A one-time modal walkthrough that teaches new users the core gameplay loop — **dice → combat → tier → gear** — immediately after character creation. Four short slides, friendly RPG tone, no lore. Skippable. Replayable from Settings. Completion is timestamped on the `Character` record so we can measure activation.

Currently, a new user creates a character at `/onboarding`, lands on `/objectives` (productivity view), and has zero in-app explanation of how dice are earned, why combat matters, what tier progression unlocks, or how gear closes the loop. Roadmap Phase 3 calls for a _functional_ introduction: _"Introducción funcional: Explicación del loop y consecuencias (evitar lore pesado)"_.

## Validation Hypothesis

If we explain the loop in under 30 seconds with visuals, more beta users will reach their first combat and first gear equip — the two acts that prove the loop. We will know this is true if:

- **80% completion**: of users shown the tutorial, at least 80% click through to the last slide (vs. skipping early)
- **Lift on first-combat rate**: 7-day post-signup combat rate increases vs. the pre-tutorial baseline
- **Lift on first-equip rate**: 7-day post-signup equip rate increases vs. the pre-tutorial baseline

If completion is high but combat/equip rates do not move, the copy is wrong, not the format. Iterate on the slide content before adding scope.

## What's In (MVP)

- **4-slide modal** triggered automatically on first workspace render when `tutorialCompletedAt` is null
- **Slides**: Dice → Combat → Tier → Gear (icon + headline + one-line body each)
- **Controls**: dot indicator, `Skip`, `Back`, `Next`, `Got it`
- **Skip = complete**: skipping marks the tutorial as completed (we asked, they declined — don't nag)
- **Replay button** in `/settings`
- **Timestamp persistence** on `Character.tutorialCompletedAt` for analytics

## What's Out (Deferred)

| Feature                                                              | Deferred Until                                                         |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Guided in-app tour (popovers anchored to real UI)                    | Modal completion is high but combat/equip rates do not lift            |
| Sidebar checklist ("Complete first habit", "Win first combat", etc.) | Beta data shows users complete the modal but stall before first action |
| Per-route contextual tooltips (e.g. first visit to `/quests`)        | Users ask "where do I go now" after the modal                          |
| Video / animated slides                                              | Static icons underperform                                              |
| Lore-heavy intro                                                     | Never — roadmap explicitly says "evitar lore pesado"                   |
| Tutorial A/B variants                                                | We have enough beta volume to power the test                           |

## Slide Content

Friendly, energetic, RPG-themed (per AGENTS.md "Copy Tone"). One headline, one line of body, one icon.

| #   | Icon (pixelarticons) | Headline (EN)  | Body (EN)                                                                             |
| --- | -------------------- | -------------- | ------------------------------------------------------------------------------------- |
| 1   | `Dice`               | Earn Dice      | Complete habits, tasks, and objectives to fill your dice bank.                        |
| 2   | `Sword`              | Roll in Combat | Spend dice in quest battles to attack, defend, and cast doctrines.                    |
| 3   | `Trophy`             | Tier Up        | Defeat enemies to climb your class tier. Higher tiers unlock new gear and doctrines.  |
| 4   | `Shield`             | Equip Gear     | Buy gear in the Shop and equip it from your Inventory. Stronger gear, tougher quests. |

Spanish copy lives next to the English copy in `public/locales/es/translation.json`. Tone: same friendly RPG voice (e.g. "Lánzate al combate", not literal-formal).

## Trigger & Persistence

- Trigger lives in `src/app/(workspace)/layout.tsx`. On mount (and after auth resolves), query `character.getCurrentClass`. If `tutorialCompletedAt === null`, open the modal.
- Open state is **derived**, not mirrored: do not call `setState` inside `useEffect` (violates the project lint rule documented in `AGENTS.md`). Instead derive `open` from `character?.tutorialCompletedAt === null && !manuallyClosed`, where `manuallyClosed` is a small piece of session state set when the user closes/completes/skips.
- Existing characters (created before this ships) get a backfill in the same migration: `tutorialCompletedAt = NOW()` for any character whose current class tier > 1 OR who has any equipped gear (non-empty `loadout`) OR who has at least one completed `CharacterQuest`. Rationale: these users have already proven they understand the loop; nag-bombing engaged beta users with a forced modal is a worse failure mode than missing a few activations on the metric. Only genuinely new / inactive characters fall through to `null` and see the tutorial.
- Replay from `/settings` calls `character.resetTutorial`, which sets `tutorialCompletedAt = null`. The settings mutation's `onSuccess` invalidates `character.getCurrentClass` _and_ clears the `manuallyClosed` flag in shared state so the modal reopens without a reload.

## Database

Add one nullable column to `Character`:

```prisma
model Character {
  // ... existing fields
  tutorialCompletedAt DateTime? @db.Timestamp(6)
}
```

Migration: `pnpm db:generate`. Nullable. After Prisma generates the schema migration, append a backfill SQL block to the same migration file so the column add and the backfill ship atomically:

```sql
-- Backfill: skip the modal for users who already understand the loop.
UPDATE characters c
SET tutorial_completed_at = NOW()
WHERE EXISTS (
  SELECT 1 FROM character_classes cc WHERE cc.character_id = c.id AND cc.tier > 1
)
   OR jsonb_array_length(COALESCE(c.loadout, '[]'::jsonb)) > 0
   OR EXISTS (
  SELECT 1 FROM character_quests cq WHERE cq.character_id = c.id AND cq.completed_at IS NOT NULL
);
```

Analytics query:

```sql
SELECT COUNT(*) FROM characters WHERE tutorial_completed_at IS NOT NULL;
```

(Caveat: the analytics counter is now polluted by the backfilled rows. Either filter on `tutorial_completed_at >= '<deploy date>'` for activation metrics, or capture the count of backfilled rows pre-deploy as the baseline to subtract. Prefer the date filter.)

## Backend

### Repository — `src/server/repositories/character.repository.ts`

```ts
async setTutorialCompletedAt(userId: string, value: Date | null) {
  return this.prisma.character.update({
    where: { userId },
    data: { tutorialCompletedAt: value }
  })
}
```

### Service — `src/server/services/character.service.ts`

```ts
async completeTutorial(userId: string) {
  return this.characterRepository.setTutorialCompletedAt(userId, new Date())
}
async resetTutorial(userId: string) {
  return this.characterRepository.setTutorialCompletedAt(userId, null)
}
```

### Router — `src/server/routers/character.router.ts`

Add to the existing `characterRouter`:

```ts
completeTutorial: protectedProcedure.use(rateLimit(RATE_LIMITS.write)).mutation(({ ctx }) =>
  ctx.services.character.completeTutorial(ctx.user.id)
),
resetTutorial: protectedProcedure.use(rateLimit(RATE_LIMITS.write)).mutation(({ ctx }) =>
  ctx.services.character.resetTutorial(ctx.user.id)
)
```

(Match the rate-limit middleware used by sibling write mutations like `switchClass`.)

### Expose `tutorialCompletedAt` on the existing query

`CharacterService.getCurrentClass` does NOT use a Prisma `select` — it builds the response by hand-mapping fields (`src/server/services/character.service.ts` ~lines 34–68). Adding the column to `prisma/schema.prisma` is **not** sufficient on its own. Add it explicitly to the returned object literal:

```ts
return {
  id: character.id,
  // ... existing fields ...
  tutorialCompletedAt: character.tutorialCompletedAt,
  classes: character.classes.map(/* ... */)
}
```

The frontend uses the existing `character.getCurrentClass` query (no new procedure, no naming divergence with the rest of the codebase).

## Frontend

### New component — `src/components/tutorial/tutorial-dialog.component.tsx`

`'use client'`. Wraps `@/components/ui/dialog.component` (Radix). Internal state:

```ts
const [step, setStep] = useState(0)
const slides = ['dice', 'combat', 'tier', 'gear'] as const
const isLast = step === slides.length - 1
```

Renders icon + headline + body for the current slide, dot indicator, `Skip` (always visible), `Back` (when `step > 0`), `Next` (when `!isLast`), `Got it` (when `isLast`). Both `Skip` and `Got it` call `onComplete`.

**Dismiss semantics** — to honour "Skip = complete, don't nag", the modal must NOT close silently:

```tsx
<DialogContent
  onEscapeKeyDown={(e) => e.preventDefault()}
  onPointerDownOutside={(e) => e.preventDefault()}
>
```

This forces the user through one of the explicit buttons (Skip / Got it), each of which calls `onComplete`. The Radix close-X is omitted. Result: there is no path that closes the modal without persisting `tutorialCompletedAt`.

Props:

```ts
type Props = {
  open: boolean
  onComplete: () => void
}
```

(No `onOpenChange` — the only way out is `onComplete`.)

### Trigger state — shared store

Replay-from-Settings must reopen the modal without a reload. A module-level Zustand slice in `src/stores/tutorial.store.ts` holds the closed-this-session flag:

```ts
type TutorialState = {
  manuallyClosed: boolean
  setClosed: () => void
  reopen: () => void
}

export const useTutorialStore = create<TutorialState>((set) => ({
  manuallyClosed: false,
  setClosed: () => set({ manuallyClosed: true }),
  reopen: () => set({ manuallyClosed: false })
}))
```

### Wire trigger — `src/app/(workspace)/layout.tsx`

```tsx
const { data: session } = useSession()
const { data: character } = useQuery({
  ...trpcOptions.character.getCurrentClass.queryOptions(),
  enabled: !!session?.user
})
const manuallyClosed = useTutorialStore((s) => s.manuallyClosed)
const setClosed = useTutorialStore((s) => s.setClosed)

const completeMutation = useMutation(
  trpcOptions.character.completeTutorial.mutationOptions({
    // Optimistic update: cache write flips derived `open` to false immediately.
    // Use a `Date` (not `.toISOString()`) — server returns Prisma DateTime → tRPC superjson hydrates as `Date`.
    // Writing a string here breaks the `Date | null` type contract for sibling consumers of `getCurrentClass`.
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: trpc.character.getCurrentClass.queryKey() })
      const prev = queryClient.getQueryData(trpc.character.getCurrentClass.queryKey())
      queryClient.setQueryData(trpc.character.getCurrentClass.queryKey(), (old: any) =>
        old ? { ...old, tutorialCompletedAt: new Date() } : old
      )
      setClosed() // local close — paired with rollback in onError
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(trpc.character.getCurrentClass.queryKey(), ctx.prev)
      reopen() // roll back local close so the user is not silently re-nagged on next reload
      toast.error(t('tutorial.complete_failed')) // surface the failure
    }
    // No onSettled invalidation: the optimistic write already matches the server result
    // (a single timestamp field), and invalidating `getCurrentClass` would needlessly refetch
    // for every active subscriber (sidebar, /quests, /shop, /inventory).
  })
)

// Derived — no setState in effect
const open = !!character && character.tutorialCompletedAt === null && !manuallyClosed
```

Render:

```tsx
<TutorialModal
  open={open}
  onComplete={() => completeMutation.mutate()}
/>
```

The local close is now coupled to the mutation lifecycle: `onMutate` calls `setClosed()` (so the modal shuts immediately), `onError` calls `reopen()` and toasts the failure. Network blip → user is not silently lost; they see the error and the modal stays interactive. Success path is unchanged: server persists, `manuallyClosed` is irrelevant once `tutorialCompletedAt !== null`.

We deliberately use `useQuery` here rather than the project's usual `useSuspenseQuery` so the workspace layout never blocks on this optional check — failed/slow queries should not delay the rest of the app.

### Settings replay — `src/app/(workspace)/settings/page.tsx`

Add a row with a button labelled `t('settings.replay_tutorial')`. On click, fire `character.resetTutorial` mutation:

```ts
const reopen = useTutorialStore((s) => s.reopen)
const resetMutation = useMutation(
  trpcOptions.character.resetTutorial.mutationOptions({
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: trpc.character.getCurrentClass.queryKey() })
      reopen() // clears manuallyClosed → derived `open` in layout flips true
    }
  })
)
```

## i18n

**Merge** into existing namespaces in **both** `public/locales/en/translation.json` and `public/locales/es/translation.json` — do not overwrite the existing `settings` block.

`public/locales/en/translation.json`:

```json
"tutorial": {
  "skip": "Skip",
  "back": "Back",
  "next": "Next",
  "done": "Got it",
  "complete_failed": "Couldn't save your progress. Please try again.",
  "dice":   { "title": "Earn Dice",       "body": "Complete habits, tasks, and objectives to fill your dice bank." },
  "combat": { "title": "Roll in Combat",  "body": "Spend dice in quest battles to attack, defend, and cast doctrines." },
  "tier":   { "title": "Tier Up",         "body": "Defeat enemies to climb your class tier. Higher tiers unlock new gear and doctrines." },
  "gear":   { "title": "Equip Gear",      "body": "Buy gear in the Shop and equip it from your Inventory. Stronger gear, tougher quests." }
},
"settings": {
  "replay_tutorial": "Replay tutorial"
}
```

`public/locales/es/translation.json` — same friendly RPG voice, not literal-formal:

```json
"tutorial": {
  "skip": "Saltar",
  "back": "Atrás",
  "next": "Siguiente",
  "done": "¡Entendido!",
  "complete_failed": "No pudimos guardar tu progreso. Inténtalo de nuevo.",
  "dice":   { "title": "Gana Dados",       "body": "Completa hábitos, tareas y objetivos para llenar tu banco de dados." },
  "combat": { "title": "Lánzate al Combate", "body": "Gasta dados en batallas de misión para atacar, defender y lanzar doctrinas." },
  "tier":   { "title": "Sube de Rango",    "body": "Derrota enemigos para subir el rango de tu clase. Rangos más altos desbloquean nuevo equipo y doctrinas." },
  "gear":   { "title": "Equipa tu Botín",  "body": "Compra equipo en la Tienda y equípalo desde tu Inventario. Mejor equipo, misiones más duras." }
},
"settings": {
  "replay_tutorial": "Repetir tutorial"
}
```

## Files Touched

| Path                                                             | Change                                                                                                                                                |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `prisma/schema.prisma`                                           | add `tutorialCompletedAt DateTime? @db.Timestamp(6)` to `Character` (matches sibling timestamp columns)                                               |
| `src/server/repositories/character.repository.ts`                | add `setTutorialCompletedAt(userId, value: Date \| null)`                                                                                             |
| `src/server/services/character.service.ts`                       | add `completeTutorial`, `resetTutorial`; **add `tutorialCompletedAt` to the object literal returned by `getCurrentClass`**                            |
| `src/server/routers/character.router.ts`                         | add `completeTutorial`, `resetTutorial` mutations (with `rateLimit(RATE_LIMITS.write)`)                                                               |
| `src/server/__tests__/repositories/character.repository.test.ts` | add tests for `setTutorialCompletedAt` (Date and null)                                                                                                |
| `src/server/__tests__/services/character.service.test.ts`        | add tests for `completeTutorial`, `resetTutorial`, and `getCurrentClass` exposing the new field                                                       |
| `src/stores/tutorial.store.ts`                                   | **new** — Zustand slice holding `manuallyClosed` flag for cross-component reopen                                                                      |
| `src/components/tutorial/tutorial-dialog.component.tsx`          | **new** dialog component (non-dismissible via ESC/overlay)                                                                                            |
| `src/app/(workspace)/layout.tsx`                                 | derive `open` from query + store; render modal anywhere in the tree (Radix Dialog portals to `document.body`, mount location does not affect z-index) |
| `src/app/(workspace)/settings/page.tsx`                          | add replay button + `resetTutorial` mutation that calls `useTutorialStore.reopen()` on success                                                        |
| `public/locales/en/translation.json`                             | merge `tutorial.*` keys; add `replay_tutorial` to existing `settings` namespace                                                                       |
| `public/locales/es/translation.json`                             | same, in Spanish                                                                                                                                      |

## Tests

Follow existing patterns in `src/server/__tests__/`:

- **`character.repository.test.ts`** — `setTutorialCompletedAt(userId, new Date())` writes the timestamp; `setTutorialCompletedAt(userId, null)` clears it. Both round-trip via `findByUserId`.
- **`character.service.test.ts`** — mock the repository:
  - `completeTutorial` calls `setTutorialCompletedAt` with a `Date` instance.
  - `resetTutorial` calls `setTutorialCompletedAt` with `null`.
  - `getCurrentClass` returns `tutorialCompletedAt` on the response object (regression guard for the field-mapping bug — without an explicit test, it is easy to drop the field again later).

Routers are not unit-tested in this repo per the existing convention.

## Verification

1. **Migration**: `pnpm db:generate` (alias for `prisma migrate dev`, see `AGENTS.md` § Database) → confirm migration creates `tutorial_completed_at` column **and** runs the backfill UPDATE. Spot-check: a seeded character with `tier > 1` should now have a non-null timestamp; a freshly created tier-1 character with empty loadout should still be null.
2. **Static checks**: `pnpm lint && npx tsc --noEmit && pnpm test:run` (per AGENTS.md verification order).
3. **Manual** (`pnpm dev`):
   - Sign up new account → complete `/onboarding` → land on `/objectives` → dialog appears.
   - Click through all 4 slides → modal closes → reload → modal does NOT reappear.
   - Press ESC / click outside → modal does NOT close (verifies non-dismissible config).
   - Reset DB row's `tutorial_completed_at` to NULL via Prisma Studio → reload → modal reappears.
   - Settings → "Replay tutorial" → modal reappears without reload.
   - Switch language to ES → confirm Spanish copy renders.
   - Skip on slide 1 → confirm `tutorialCompletedAt` is set (skip = complete).
   - **Failure-rollback**: stop the dev server, click `Skip` → mutation fails → confirm error toast appears AND modal reopens (verifies `onError` rollback and "don't silently nag" guarantee).
   - **Backfill spot-check**: existing seed character with completed quests does NOT see the modal on first login post-deploy.
   - Sign out mid-session → confirm no `UNAUTHORIZED` errors thrown by the layout's character query (verifies `enabled: !!session?.user` gate).
4. **Analytics**: `SELECT COUNT(*) FROM characters WHERE tutorial_completed_at >= '<deploy date>'` (post-deploy filter excludes backfilled rows) increases as users complete.

## Open Questions

- Should we capture a PostHog event (`tutorial_step_viewed`, `tutorial_completed`, `tutorial_skipped`) so we can see _which slide_ users drop off on? **Recommended yes**, but blocked on the PostHog integration TODO. Until then, leave a one-line `// TODO(posthog): tutorial_step_viewed` next to each `setStep` call and at `onComplete` so wiring later is mechanical. Without per-slide events, the §Validation Hypothesis claim "iterate on copy if completion is high but combat/equip rates don't move" is only verifiable at completion granularity, not slide granularity.
