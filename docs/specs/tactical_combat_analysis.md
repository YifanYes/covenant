# Tactical Combat System - Architecture Analysis

**Date:** 2026-02-05
**Analyst:** Claude Opus 4.5 (Software Architect - Phaser 3 Specialist)

## Executive Summary

The ARQ tactical combat system is a hybrid React/Phaser 3 implementation featuring turn-based grid combat with dice-based resolution. While functionally sound, the system exhibits several architectural issues, primarily centered around **state synchronization between frontend and backend**, **memory management**, and **race conditions**. This document provides a comprehensive analysis with prioritized recommendations.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Critical Issue: State Mismatch](#2-critical-issue-state-mismatch)
3. [Memory Management Issues](#3-memory-management-issues)
4. [Race Conditions](#4-race-conditions)
5. [Code Smells](#5-code-smells)
6. [Performance Concerns](#6-performance-concerns)
7. [Type Safety Issues](#7-type-safety-issues)
8. [Recommendations](#8-recommendations)

---

## 1. Architecture Overview

### 1.1 System Components

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND                                       │
├─────────────────────────────────────────────────────────────────────────┤
│  React Components                                                        │
│  ├── TacticalCombatArena (orchestrates UI)                              │
│  ├── TacticalCanvas (Phaser container, SSR-safe)                        │
│  ├── ActionMenu, DoctrinePanel, TileInfoPanel, etc.                     │
│                                                                          │
│  Zustand Store (tactical-combat.store.ts)                                │
│  ├── Grid state: tiles[][], gridWidth, gridHeight                       │
│  ├── Units: playerUnits[], enemyUnits[]                                 │
│  ├── Turn state: turnQueue, currentTurnIndex, activeUnitId              │
│  ├── Animation state: isAttackAnimating, isDoctrineAnimating, etc.      │
│  └── UI state: phase, selectedTile, highlightedTiles                    │
│                                                                          │
│  Phaser 3 (via CombatScene)                                             │
│  ├── GridSystem (isometric rendering)                                   │
│  ├── Unit entities (sprites, health bars, animations)                   │
│  └── Pathfinding (Dijkstra, A*)                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                           BACKEND                                        │
├─────────────────────────────────────────────────────────────────────────┤
│  tRPC Router (activity.router.ts)                                        │
│  ├── executeTacticalMove                                                │
│  ├── executeTacticalAttack                                              │
│  ├── executeTacticalDoctrine                                            │
│  └── executeTacticalEnemyTurn                                           │
│                                                                          │
│  CombatService (combat.service.ts - 2800+ lines)                        │
│  ├── Movement validation/execution                                       │
│  ├── Attack resolution (dice mechanics)                                 │
│  ├── Doctrine execution (AoE, buffs, status effects)                    │
│  ├── Enemy AI (pathfinding, decision tree)                              │
│  └── State persistence                                                   │
│                                                                          │
│  Database (Prisma)                                                       │
│  ├── ActivityParticipation.tacticalState (JSON)                         │
│  ├── CombatEnemy (health, combat log)                                   │
│  └── CharacterClass (health, mana sync)                                 │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Data Flow Pattern

The system uses a **request-response model** (no WebSockets):

1. **Frontend initiates action** (move, attack, doctrine)
2. **Backend validates and resolves** (authoritative dice rolls)
3. **Backend persists to database** (tacticalState JSON)
4. **Backend returns result** (damage, deaths, next enemy)
5. **Frontend triggers animation** (Phaser scene)
6. **Frontend updates local state** (Zustand store)
7. **Frontend invalidates queries** (React Query)

---

## 2. Critical Issue: State Mismatch

### 2.1 The Core Problem

**Three separate sources of truth exist:**

| Source | Location | Content |
|--------|----------|---------|
| **Backend DB** | `ActivityParticipation.tacticalState` | Persisted `TacticalStateData` |
| **Zustand Store** | `tactical-combat.store.ts` | Runtime `TacticalCombatState` |
| **Phaser Scene** | `combat-scene.ts` | Visual `Unit` entities |

These can diverge in the following scenarios:

### 2.2 Divergence Scenarios

#### Scenario A: Unit Template Mismatch During Hydration

**Location:** `tactical-combat.store.ts:337-341`

```typescript
const template = unitTemplates.find((t) => t.id === persistedUnit.id)
if (!template) {
  console.warn(`Unit template not found for id: ${persistedUnit.id}, skipping unit`)
  continue  // Unit is silently dropped!
}
```

**Problem:** If a unit exists in the database but the template is missing (e.g., enemy template ID changed), the unit is **silently dropped**. This corrupts the turn queue and causes:
- Turn order mismatch between backend and frontend
- "Ghost" units in the database that don't render
- Infinite loops if the dropped unit was supposed to act

**Impact:** HIGH - Can softlock combat

---

#### Scenario B: Mana Deduction Without Server Echo

**Location:** `use-tactical-doctrine.hook.ts:291` (inferred from patterns)

```typescript
// Frontend deducts mana locally AFTER server success
updateUnit(activeUnitId, {
  currentMana: caster.currentMana - doctrine.manaCost  // Uses local value!
})
```

**Problem:** Frontend calculates new mana from local state, not from server response. If the server had a different mana value (e.g., mana was modified by another effect), the frontend will be wrong.

**Impact:** MEDIUM - Causes UI confusion, doesn't affect actual gameplay (server is authoritative)

---

#### Scenario C: Turn Queue Desync After Deaths

**Location:** `combat.service.ts:773-793` vs `tactical-combat.store.ts:1096-1105`

Both backend and frontend maintain their own turn queue filtering logic:

**Backend:**
```typescript
const updatedTurnOrder = state.turnOrder.filter((unitId) => {
  const unit = updatedUnits.find((u) => u.id === unitId)
  return unit && unit.currentHealth > 0
})
```

**Frontend:**
```typescript
const allAliveUnits = [...updatedPlayerUnits, ...updatedEnemyUnits]
const aliveUnitIds = new Set(allAliveUnits.map((u) => u.id))
const updatedTurnQueue = turnQueue.filter((u) => aliveUnitIds.has(u.id))
```

**Problem:** Both use similar logic but operate on different data. If units die in different orders or the frontend receives stale data, turn queues diverge.

**Impact:** HIGH - Wrong unit acts, combat becomes unpredictable

---

#### Scenario D: Animation State Blocks Reinitialization

**Location:** `tactical-combat-arena.component.tsx:277-280`

```typescript
if (storeState.isAttackAnimating || storeState.isDoctrineAnimating || storeState.animatingUnitId) {
  return  // Skip reinitialization during animation
}
```

**Problem:** If the user tabs away during an animation and returns, the tactical state query may have refreshed, but the frontend won't reinitialize because animation flags are still set. This leaves the frontend with stale data.

**Impact:** MEDIUM - Stale state until page refresh

---

#### Scenario E: Fresh Grid on Enemy Spawn Ignores Map Theme

**Location:** `tactical-combat.store.ts:1025-1040`

```typescript
// Create fresh grid - ALWAYS creates GRASS/STONE pattern regardless of actual map
const freshTiles: TileState[][] = []
for (let y = 0; y < gridHeight; y++) {
  freshTiles[y] = []
  for (let x = 0; x < gridWidth; x++) {
    let terrain: TerrainType = 'GRASS'
    if (x === 0 || x === gridWidth - 1 || y === 0 || y === gridHeight - 1) {
      terrain = 'STONE'
    }
    // ...
  }
}
```

**Problem:** When spawning a new enemy after defeating one, the frontend creates a hardcoded grass/stone grid instead of using the actual map theme from `mapTemplateId`. The backend correctly uses `generateMapTiles()`.

**Impact:** MEDIUM - Visual inconsistency, may affect terrain-based mechanics

---

### 2.3 Root Cause Analysis

1. **No state version tracking** - No optimistic locking or version numbers to detect stale writes
2. **Dual state management** - Frontend maintains full state instead of treating backend as source of truth
3. **Incomplete server responses** - Server doesn't always return complete refreshed state
4. **Missing reconciliation** - No mechanism to detect and repair frontend/backend drift

---

## 3. Memory Management Issues

### 3.1 Tween Cleanup on Scene Destruction

**Location:** `combat-scene.ts:270-277`, `unit.ts` (various tween methods)

```typescript
// In handleMovementAnimation
try {
  await unit.animateMovement(path, gridToScreen)
} finally {
  this.isAnimating = false
  useTacticalCombatStore.getState().completeAnimation()
}
```

**Problem:** If the scene is destroyed mid-animation (e.g., user navigates away), tweens may continue referencing destroyed objects. The `Unit.destroy()` method calls `stopBounce()` and `stopBreathing()`, but doesn't guarantee cleanup of movement/attack tweens.

**Impact:** MEDIUM - Console errors, potential memory leaks

---

### 3.2 Particle Emitter Delayed Cleanup

**Location:** `combat-scene.ts:510-512, 723-726`

```typescript
// Cleanup after particles fade
this.time.delayedCall(500, () => {
  particles.destroy()  // What if scene is destroyed before this fires?
})
```

**Problem:** All particle cleanup uses `delayedCall()` without cancellation on scene shutdown. If the scene is destroyed before the timer fires, the callback may error or leak.

**Impact:** LOW - Memory buildup in rapid scene transitions

---

### 3.3 Store Subscription Leak Potential

**Location:** `combat-scene.ts:53, 1227`

```typescript
// In create()
this.unsubscribe = useTacticalCombatStore.subscribe((newState) => {
  this.syncWithState(newState)
})

// In shutdown()
if (this.unsubscribe) {
  this.unsubscribe()
}
```

**Problem:** Shutdown only runs if the scene goes through proper lifecycle. If Phaser is destroyed abruptly (e.g., component unmount race condition), the subscription may persist.

**Impact:** LOW - Multiple subscriptions if scene is recreated

---

### 3.4 Texture Loading State Never Cleared on Failure

**Location:** `combat-scene.ts:1192-1210`

```typescript
if (!hasTexture && !isLoading) {
  this.loadingTextures.add(customTextureKey)
  this.load.image(customTextureKey, unitData.spriteUrl)
  this.load.once('complete', () => {
    this.loadingTextures.delete(customTextureKey)
    // ...
  })
  this.load.start()
}
```

**Problem:** No error handler for texture load failure. If loading fails, `loadingTextures` set keeps the entry forever, and the sprite never updates.

**Impact:** LOW - Unit stays as placeholder circle forever

---

## 4. Race Conditions

### 4.1 Enemy Turn Execution Guard

**Location:** `use-tactical-enemy-turn.hook.ts:29-31`

```typescript
const executingRef = useRef(false)

// In useEffect
if (executingRef.current) {
  return  // Guarded by ref, not actual state
}
```

**Problem:** The `executingRef` is a React ref that doesn't trigger re-renders. If the effect fires twice rapidly (e.g., due to React strict mode or fast state changes), both might read `false` before either sets it to `true`.

**Impact:** LOW - Double enemy turn execution (rare)

---

### 4.2 Multiple Animation Flags

**Location:** `combat-scene.ts:24-27`

```typescript
private isAnimating = false
private isAttackAnimating = false
private isDoctrineAnimating = false
private isStatusEffectAnimating = false
```

**Problem:** Four independent boolean flags can theoretically all be true simultaneously. The sync logic assumes mutual exclusivity:

```typescript
// Line 249
if (!this.isAnimating && !this.isAttackAnimating && !this.isDoctrineAnimating) {
  this.syncUnits([...state.playerUnits, ...state.enemyUnits])
}
```

If flags get out of sync, units may never re-sync.

**Impact:** MEDIUM - Potential deadlock in unit sync

---

### 4.3 Async State Access in Callbacks

**Location:** `use-tactical-enemy-turn.hook.ts:34`

```typescript
const executeEnemyTurn = async () => {
  const state = useTacticalCombatStore.getState()
  // ... uses state.enemyUnits

  // Much later...
  await mutation.mutateAsync({...})

  // State may have changed during the await!
  useTacticalCombatStore.getState().nextTurn()  // Fresh state access - good
}
```

**Problem:** The `state` variable is captured at the start, but enemy data may be stale by the time the mutation completes. Partially mitigated by re-fetching for `nextTurn()`, but `enemyUnits` used for validation may be outdated.

**Impact:** LOW - Rare edge case

---

## 5. Code Smells

### 5.1 God Object: CombatService

**Location:** `server/services/combat.service.ts`

**Size:** 2800+ lines, 50+ methods

**Responsibilities:**
- Dice rolling
- Movement validation/execution
- Attack resolution
- Doctrine execution (10+ types)
- Enemy AI pathfinding
- Status effect processing
- Gold/material rewards
- Tier progression
- State persistence

**Recommendation:** Split into focused services:
- `DiceService` - Rolling, hit calculation
- `MovementService` - Path validation, terrain costs
- `CombatResolutionService` - Attack/defense resolution
- `DoctrineService` - Spell execution
- `EnemyAIService` - Decision tree, pathfinding
- `RewardService` - Gold, materials, progression

---

### 5.2 Duplicated Fresh Grid Logic

**Locations:**
- `tactical-combat.store.ts:1025-1040` (completeAttackAnimation)
- `tactical-combat.store.ts:1453-1468` (completeDoctrineAnimation)
- `tactical-combat.store.ts:156-180` (createDefaultGrid)

All three create the same hardcoded GRASS/STONE grid pattern instead of using a shared utility.

**Recommendation:** Extract to `shared/utils/grid.utils.ts`

---

### 5.3 Magic Numbers

**Locations:**
- `combat.service.ts:1629` - `const playerDefenseDice = 2`
- `use-tactical-enemy-turn.hook.ts:82-83` - `enemyAttackDice: 2, enemyAttackThreshold: 4`
- `use-tactical-attack.hook.ts:94-96` - `attackThreshold: 4, defenseThreshold: 4`

**Recommendation:** Move to `shared/constants/combat-rules.ts`

---

### 5.4 Inconsistent Error Handling

**Pattern A:** Silent warning + continue
```typescript
console.warn(`Unit template not found for id: ${persistedUnit.id}, skipping unit`)
continue
```

**Pattern B:** Toast + return error object
```typescript
toast.error(t('combat.error.no_participation'))
return { success: false, error: 'No participation ID' }
```

**Pattern C:** Throw TRPCError
```typescript
throw new TRPCError({ code: 'NOT_FOUND', message: 'Doctrine not found' })
```

**Recommendation:** Standardize on Pattern B for frontend, Pattern C for backend

---

### 5.5 Deep Prop Drilling

**Location:** `tactical-combat-arena.component.tsx`

The component receives many props and passes them through multiple layers:
- `character`, `enemies`, `combatLog`, `diceBank`, `participationId`, `activeDoctrines`, `failureText`, `mapId`

**Recommendation:** Use context or combine into a single `combatContext` object

---

### 5.6 Type Assertions Hiding Issues

**Location:** `page.tsx:244`

```typescript
diceBank={(character.data as any)?.diceBank ?? 0}
```

The `any` cast hides potential type mismatches. If `data` structure changes, this silently returns 0.

**Recommendation:** Define proper types for character.data

---

## 6. Performance Concerns

### 6.1 Full Unit Sync on Every State Change

**Location:** `combat-scene.ts:249-251`

```typescript
if (!this.isAnimating && !this.isAttackAnimating && !this.isDoctrineAnimating) {
  this.syncUnits([...state.playerUnits, ...state.enemyUnits])
}
```

**Problem:** `syncUnits` iterates all units and updates their positions/states even when only one thing changed (e.g., hoveredTile). This runs on every Zustand state change.

**Recommendation:** Track which state properties actually changed and only sync affected systems

---

### 6.2 Pathfinding on Every Move Selection

**Location:** `tactical-combat.store.ts:572-578`

```typescript
const movementTiles = calcMoveRange(
  activeUnit.position,
  activeUnit.movementRange,
  tiles,
  allUnits,
  activeUnit.isPlayer
)
```

**Problem:** Dijkstra's algorithm runs every time the user selects "Move", even if nothing has changed since the last time.

**Recommendation:** Cache movement range until unit position changes

---

### 6.3 JSON Parsing on Every Activity List Query

**Location:** Implicit in tRPC

The `tacticalState` JSON field is parsed on every `activity.list` query, even when only checking activity progress.

**Recommendation:** Separate tactical state endpoint with lazy loading

---

## 7. Type Safety Issues

### 7.1 Inconsistent Unit Types

**Frontend:** `TacticalUnit` (includes `currentMana`, `movementRange`, `speed`)
**Backend DB:** `TacticalUnitState` (minimal subset)
**Phaser:** `Unit` class with `unitData: TacticalUnit`

Hydration merges these, but TypeScript can't verify the merge is complete.

---

### 7.2 Unsafe Doctrine Effect Access

**Location:** `combat.service.ts:2104`

```typescript
if (enemyTemplate && 'tier' in enemyTemplate) {
  enemyTier = (enemyTemplate as any).tier || 2
}
```

**Problem:** Type assertion to `any` bypasses TypeScript entirely.

**Recommendation:** Add `tier` to enemy template types

---

### 7.3 Status Effect String vs Enum

**Location:** `tactical-combat.store.ts:1388`

```typescript
const newStatusEffect: ActiveStatusEffect = {
  effect: statusApplied as StatusEffect,  // Unsafe cast from string
  // ...
}
```

**Problem:** `statusApplied` is `string | undefined` but cast directly to `StatusEffect` enum.

**Recommendation:** Validate against enum values before assignment

---

## 8. Recommendations

### 8.1 Priority 1: State Synchronization (HIGH)

| Issue | Fix | Effort |
|-------|-----|--------|
| Unit template mismatch | Add version field to `TacticalStateData`, reject stale hydration | Medium |
| Turn queue desync | Backend returns `updatedTurnQueue` in all mutation responses; frontend trusts it | Low |
| Mana deduction | Return `newMana` from server; frontend uses response value only | Low |
| Grid theme mismatch | Pass `mapTemplateId` to frontend spawn logic; use shared generation | Medium |

### 8.2 Priority 2: Memory Management (MEDIUM)

| Issue | Fix | Effort |
|-------|-----|--------|
| Tween cleanup | Create `activeTweens` registry; destroy all on scene shutdown | Medium |
| Particle cleanup | Use `once('complete', cleanup)` instead of `delayedCall` | Low |
| Texture load failure | Add error handler to `this.load.once('loaderror', ...)` | Low |
| Subscription leak | Call `unsubscribe()` in both `shutdown()` and `destroy()` | Low |

### 8.3 Priority 3: Race Conditions (MEDIUM)

| Issue | Fix | Effort |
|-------|-----|--------|
| Enemy turn guard | Use state flag + ref together; debounce effect | Low |
| Multiple animation flags | Replace with single `animationType: 'movement' | 'attack' | 'doctrine' | 'status' | null` | Medium |
| Async state access | Refresh state after each await in critical paths | Low |

### 8.4 Priority 4: Code Quality (LOW)

| Issue | Fix | Effort |
|-------|-----|--------|
| CombatService size | Extract to 5+ focused services | High |
| Duplicated grid logic | Create `shared/utils/grid.utils.ts` | Low |
| Magic numbers | Create `shared/constants/combat-rules.ts` | Low |
| Error handling | Standardize patterns across codebase | Medium |
| Type assertions | Define proper types; remove `as any` | Medium |

---

## Appendix A: File Reference

| File | Lines | Purpose |
|------|-------|---------|
| `front/stores/tactical-combat.store.ts` | 1646 | Zustand state management |
| `front/lib/phaser/scenes/combat-scene.ts` | 1269 | Phaser rendering/animation |
| `server/services/combat.service.ts` | 2800+ | Backend combat logic |
| `shared/types/tactical-combat.types.ts` | 316 | TypeScript definitions |
| `front/hooks/use-tactical-attack.hook.ts` | 205 | Attack execution hook |
| `front/hooks/use-tactical-enemy-turn.hook.ts` | 167 | Enemy AI hook |
| `front/components/tactical/tactical-combat-arena.component.tsx` | ~300 | Main UI orchestrator |

---

## Appendix B: State Flow Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                      USER ACTION                                  │
│                   (click tile, confirm)                           │
└─────────────────────────┬────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│                    FRONTEND HOOK                                  │
│              (use-tactical-attack.hook.ts)                        │
│                                                                   │
│  1. Validate local state (target exists, in range)               │
│  2. Call tRPC mutation                                            │
└─────────────────────────┬────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│                    BACKEND SERVICE                                │
│                (combat.service.ts)                                │
│                                                                   │
│  1. Fetch fresh state from DB                                    │
│  2. Validate action (turn, range, mana)                          │
│  3. Resolve dice rolls (AUTHORITATIVE)                           │
│  4. Calculate damage, deaths                                     │
│  5. Update tactical state                                        │
│  6. Sync character health/mana to CharacterClass                 │
│  7. Handle enemy defeat (gold, materials, next spawn)            │
│  8. Persist to DB                                                │
│  9. Return result                                                │
└─────────────────────────┬────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│                    FRONTEND HOOK                                  │
│                                                                   │
│  1. Receive result from server                                   │
│  2. Call store.startAttackAnimation(result)                      │
│  3. Invalidate React Query caches                                │
└─────────────────────────┬────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│                    ZUSTAND STORE                                  │
│                                                                   │
│  1. Set phase = 'animating'                                      │
│  2. Set attackAnimationData = result                             │
│  3. Notify subscribers (Phaser scene)                            │
└─────────────────────────┬────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│                    PHASER SCENE                                   │
│                                                                   │
│  1. syncWithState() detects animation state                      │
│  2. handleAttackAnimation() runs                                 │
│  3. Plays visual animations (tweens, particles)                  │
│  4. On complete: store.completeAttackAnimation()                 │
└─────────────────────────┬────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│                    ZUSTAND STORE                                  │
│                                                                   │
│  1. Apply damage to local unit state                             │
│  2. Remove dead units from arrays                                │
│  3. Update turn queue                                            │
│  4. If nextEnemy: spawn new enemy, reset grid  ← STATE MISMATCH! │
│  5. Set phase = 'select_action' or 'enemy_turn'                  │
└──────────────────────────────────────────────────────────────────┘
```

---

**End of Analysis**
