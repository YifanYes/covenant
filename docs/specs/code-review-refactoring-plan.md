# ARQ Codebase Review: Refactoring Plan

## Executive Summary

Comprehensive review of the ARQ monorepo identified improvements across SOLID principles, DRY, and architectural patterns. The codebase is generally well-structured but shows organic growth patterns in the combat domain.

**Key Metrics:**

- `CombatService`: 2,700+ lines (SRP violation)
- `tactical-combat.store.ts`: 1,500+ lines (needs decomposition)
- 3x duplicated `getCharacterProgress` logic
- Inconsistent error handling patterns

---

## Priority 1: Quick Wins (Low Risk, High Impact)

### 1.1 Extract Character Progress Utility

**Problem:** `getCharacterProgress()` duplicated in 3 files with identical logic.

**Files:**

- `server/services/character.service.ts` (lines 15-27)
- `server/services/combat.service.ts` (lines 95-100)
- `server/services/dice.service.ts`

**Solution:** Create `server/utils/character.utils.ts`:

```typescript
export function getCharacterProgress(character: CharacterWithClasses): CharacterProgress {
  const currentClass = character.classes.find((c) => c.className === character.currentClass)
  const tier = currentClass?.tier || 1
  const maxDice = getMaxDiceForTier(tier)
  const diceBank = (character.data as any)?.diceBank || 0
  return { currentClass, tier, maxDice, diceBank }
}
```

### 1.2 Standardize Error Handling

**Problem:** `CharacterService` uses `throw new Error()` while other services use `TRPCError`.

**Files:** `server/services/character.service.ts`

**Solution:** Replace all `throw new Error()` with `TRPCError`:

```typescript
// Before
throw new Error('Character not found')
// After
throw new TRPCError({ code: 'NOT_FOUND', message: 'Character not found' })
```

### 1.3 Consolidate Dice Reward Constants

**Problem:** Dice reward logic scattered between `HabitService` and `TaskService`.

**Solution:** Move streak bonus logic to `shared/constants/dice.constants.ts`:

```typescript
export const HABIT_STREAK_THRESHOLDS = [
  { days: 21, bonus: 3 },
  { days: 14, bonus: 2 },
  { days: 7, bonus: 1 }
]
```

---

## Priority 2: Combat Service Decomposition

### 2.1 Split CombatService into Focused Services

**Problem:** 2,700+ lines handling 8+ responsibilities (SRP violation).

**Current responsibilities:**

- Dice rolling & hit calculation
- Movement validation/execution
- Attack execution
- Doctrine casting
- Enemy AI turns
- Status effect processing
- Consumable usage
- State management

**Solution:** Create `server/services/combat/` directory:

```
server/services/combat/
  index.ts                    # Re-exports
  combat.service.ts           # Orchestrator (~300 lines)
  movement.service.ts         # validateTacticalMove, executeTacticalMove
  attack.service.ts           # validateTacticalAttack, executeTacticalAttack
  doctrine.service.ts         # executeTacticalDoctrine
  enemy-ai.service.ts         # executeEnemyTurn, AI pathfinding
  status-effects.service.ts   # processStatusEffects
```

### 2.2 Extract Combat Math Utilities

**Solution:** Create `server/utils/combat.utils.ts`:

```typescript
export function rollDice(count: number): number[]
export function calculateHits(rolls: number[], threshold: number, criticalThreshold?: number)
export function getManhattanDistance(from: GridPosition, to: GridPosition): number
```

---

## Priority 3: Frontend Store Decomposition

### 3.1 Split Tactical Combat Store

**Problem:** `tactical-combat.store.ts` has 1,500+ lines with 150+ state properties.

**Solution:** Use Zustand slices pattern.

> **Zustand Slices Pattern:** Split a large store into smaller "slices", each managing a specific domain of state. Each slice is a function that receives `set` and `get` and returns its state + actions. Slices are combined using the spread operator in the main store's `create()` call. This keeps each slice focused (~200-400 lines) while sharing access to the full store state.

```typescript
// Example slice structure
type CoreSlice = { grid: Grid; units: Unit[]; setGrid: (grid: Grid) => void }
type UISlice = { hoveredId: string | null; setHovered: (id: string | null) => void }

const createCoreSlice: StateCreator<Store, [], [], CoreSlice> = (set) => ({
  grid: null,
  units: [],
  setGrid: (grid) => set({ grid })
})

const createUISlice: StateCreator<Store, [], [], UISlice> = (set) => ({
  hoveredId: null,
  setHovered: (id) => set({ hoveredId: id })
})

// Combine slices
const useStore = create<Store>()((...args) => ({
  ...createCoreSlice(...args),
  ...createUISlice(...args)
}))
```

**Proposed directory structure:**

```
front/stores/tactical-combat/
  index.ts                    # Main store combining slices
  core.slice.ts               # Grid, units, turn management
  movement.slice.ts           # Movement selection/animation
  attack.slice.ts             # Attack selection/animation
  doctrine.slice.ts           # Doctrine selection/animation
  ui.slice.ts                 # Hover, selection, highlights
```

### 3.2 Extract Combat Hook Validation

**Problem:** Duplicated validation in `use-tactical-attack.hook.ts` and `use-tactical-doctrine.hook.ts`.

**Solution:** Create `front/utils/tactical-validation.utils.ts`:

```typescript
export function validateCombatAction(params: {
  participationId: string | null
  activeUnitId: string | null
  playerUnits: TacticalUnit[]
}): ValidationResult
```

---

## Priority 4: Form Dialog Abstraction

**Problem:** `create-task-dialog`, `create-habit-dialog`, `create-objective-dialog` follow identical patterns.

**Solution:** Create higher-order component or hook:

```typescript
// front/hooks/use-form-dialog.ts
export function useFormDialog<T>({ schema, mutationOptions, invalidateQueries })
```

---

## Priority 5: Query Invalidation Centralization

**Problem:** Same `invalidateQueries` calls scattered across hooks/components.

**Solution:** Create `front/utils/query-invalidation.utils.ts`:

```typescript
export function invalidateTaskQueries(monthIndex: number)
export function invalidateCombatQueries(participationId?: string)
export function invalidateHabitQueries()
```

---

## Priority 6: Repository Base Pattern

**Problem:** 4 repositories implement identical `findByIdOrThrow` with ownership check.

**Solution:** Create `server/repositories/base.repository.ts`:

```typescript
export abstract class BaseRepository<T extends { id: string; userId: string }> {
  async findByIdOrThrow(id: string, userId: string): Promise<T> {
    const entity = await this.findById(id)
    if (!entity || entity.userId !== userId) {
      throw new TRPCError({ code: 'NOT_FOUND', message: `${this.modelName} not found` })
    }
    return entity
  }
}
```

---

## Files to Modify

| Priority | File                                       | Change                      |
| -------- | ------------------------------------------ | --------------------------- |
| 1        | `server/utils/character-progress.utils.ts` | Create new                  |
| 1        | `server/services/character.service.ts`     | Use utility, fix errors     |
| 1        | `server/services/combat.service.ts`        | Use utility                 |
| 1        | `shared/constants/dice.constants.ts`       | Add streak thresholds       |
| 2        | `server/services/combat/`                  | Create directory + services |
| 2        | `server/utils/combat-math.utils.ts`        | Create new                  |
| 3        | `front/stores/tactical-combat/`            | Create sliced store         |
| 3        | `front/utils/tactical-validation.utils.ts` | Create new                  |
| 4        | `front/hooks/use-entity-form-dialog.ts`    | Create new                  |
| 5        | `front/utils/query-invalidation.utils.ts`  | Create new                  |
| 6        | `server/repositories/base.repository.ts`   | Create new                  |
