# Migrating from Tactical Grid Combat to Turn-Based (Pokemon-Style) Combat

## Context

The current combat system is a **Final Fantasy Tactics-style tactical JRPG** built with Phaser 3 for isometric grid rendering, Dijkstra/A\* pathfinding, and sprite-based animations. While fully functional, the complexity of maintaining a Phaser 3 integration inside a Next.js app is disproportionate for a productivity platform.

This document proposes migrating to a **Pokemon-style turn-based combat system** built entirely in React + CSS/Framer Motion, eliminating Phaser 3 as a dependency.

---

## Why Migrate

### Problems with the current approach

1. **Phaser 3 is overkill.** ARQ is a gamified productivity app, not a tactics game. The isometric grid, pathfinding (Dijkstra + A\*), camera drag-to-pan, and sprite tween system add ~3,000 lines of rendering code for minimal gameplay value.

2. **Fragile coupling.** The React ↔ Phaser ↔ Zustand bridge requires manual state synchronization. Every new feature touches 3 layers: Zustand store (1,668 lines), Phaser CombatScene (1,283 lines), and React components.

3. **SSR incompatibility.** Phaser requires `dynamic()` imports with `ssr: false`, window existence checks, and a singleton game instance pattern. This adds friction to Next.js development.

4. **Slow iteration.** Adding a new mechanic (item, status effect, ability) requires changes in Phaser scenes, Zustand actions, React overlays, and backend validation. A React-only system halves this surface area.

5. **Heavy dependency.** Phaser 3 is ~1MB bundled. For a feature that's a fraction of the app's usage, this is disproportionate.

### Benefits of Pokemon-style combat

1. **100% React/Tailwind/Framer Motion** - no external game engine, full SSR compatibility
2. **Simpler mental model** - select action → resolve → next turn (no spatial reasoning)
3. **Faster to extend** - new abilities, items, and enemies are just JSX + backend logic
4. **~70% backend reuse** - dice system, damage resolution, doctrines, rewards all stay
5. **Better mobile UX** - no camera dragging, no tiny tile tapping on small screens
6. **Consistent with ARQ's UI** - uses the same design system as the rest of the app

---

## Current System Inventory

### Files to DELETE (Phaser layer, ~3,500 lines)

| File                                                               | Lines | Purpose                  |
| ------------------------------------------------------------------ | ----- | ------------------------ |
| `front/lib/phaser/scenes/combat-scene.ts`                          | 1,283 | Main Phaser scene        |
| `front/lib/phaser/scenes/boot-scene.ts`                            | ~50   | Asset loading            |
| `front/lib/phaser/systems/grid-system.ts`                          | ~200  | Isometric grid rendering |
| `front/lib/phaser/systems/pathfinding.ts`                          | ~300  | Dijkstra + A\*           |
| `front/lib/phaser/entities/unit.ts`                                | ~150  | Sprite entity            |
| `front/lib/phaser/config.ts`                                       | ~30   | Phaser config            |
| `front/lib/phaser/game-instance.ts`                                | ~40   | Game singleton           |
| `front/components/tactical/tactical-canvas.component.tsx`          | ~80   | Phaser wrapper           |
| `front/components/tactical/tile-info-panel.component.tsx`          | ~100  | Tile hover info          |
| `front/components/tactical/doctrine-target-selector.component.tsx` | ~150  | AoE grid selector        |
| `front/hooks/use-tactical-move.hook.ts`                            | ~80   | Grid movement            |

### Files to HEAVILY SIMPLIFY

| File                                                            | Current Lines | Purpose           | Change                                                 |
| --------------------------------------------------------------- | ------------- | ----------------- | ------------------------------------------------------ |
| `front/stores/tactical-combat.store.ts`                         | 1,668         | Combat state      | Remove grid/tile/movement/animation state → ~400 lines |
| `front/components/tactical/tactical-combat-arena.component.tsx` | ~800          | Main orchestrator | Rebuild as React-only combat view                      |
| `front/components/tactical/action-menu.component.tsx`           | ~150          | Action buttons    | Simplify (no move action)                              |
| `front/components/tactical/turn-order-display.component.tsx`    | ~100          | Turn queue        | Keep, minor adapts                                     |
| `front/hooks/use-tactical-attack.hook.ts`                       | ~100          | Attack execution  | Simplify (no range validation)                         |
| `front/hooks/use-tactical-doctrine.hook.ts`                     | ~350          | Doctrine casting  | Remove AoE grid targeting                              |
| `front/hooks/use-tactical-enemy-turn.hook.ts`                   | ~160          | Enemy AI trigger  | Simplify (no movement)                                 |
| `front/hooks/use-combat-turn.hook.ts`                           | ~80           | Turn management   | Minor adapts                                           |

### Files to KEEP AS-IS (~70% of backend)

| File                                               | Purpose                                           |
| -------------------------------------------------- | ------------------------------------------------- |
| `server/services/combat.service.ts`                | Core combat orchestration                         |
| `server/utils/combat/attack-resolution.ts`         | Damage calculation, criticals, counter-attacks    |
| `server/utils/combat/dice.ts`                      | Dice rolling mechanics                            |
| `server/utils/combat/doctrine-buffs.ts`            | Status effect & buff system                       |
| `server/utils/combat/tactical-doctrine.ts`         | Doctrine execution (adapt AoE → target selection) |
| `server/utils/combat/rewards.ts`                   | Gold, materials, progression                      |
| `server/repositories/combat-enemy.repository.ts`   | Enemy persistence                                 |
| `shared/constants/doctrines.ts`                    | Doctrine definitions                              |
| `shared/constants/enemies.ts`                      | Enemy templates & scaling                         |
| `shared/constants/encounter-patterns.ts`           | Encounter sequences                               |
| `shared/constants/activities.ts`                   | Activity definitions                              |
| `server/__tests__/services/combat.service.test.ts` | Tests (adapt)                                     |

### Files to DELETE (backend, grid-specific)

| File                                                  | Purpose                         |
| ----------------------------------------------------- | ------------------------------- |
| `server/services/combat/tactical-movement.service.ts` | Server-side movement validation |
| `server/utils/combat/movement.ts`                     | Path validation, terrain costs  |
| `shared/constants/terrain.ts`                         | Terrain movement costs          |
| `shared/constants/aoe-patterns.ts`                    | Grid-based AoE offsets          |
| `shared/types/tactical-combat.types.ts`               | Rewrite (remove grid types)     |

### Dependencies to REMOVE

| Package  | Reason           |
| -------- | ---------------- |
| `phaser` | No longer needed |

---

## New Combat UI Design

### Layout

```
┌─────────────────────────────────────────────────┐
│                COMBAT SCENE                      │
│                                                  │
│  ┌───────────────────────────────────────────┐   │
│  │            ENEMY SIDE                     │   │
│  │                                           │   │
│  │   [Sprite]  [Sprite]  [Sprite]            │   │
│  │   Centinela  Acólito   Espectro           │   │
│  │   HP ████░░  HP ███░░  HP █████░          │   │
│  │   🔥 Burn    ❄ Freeze                      │   │
│  └───────────────────────────────────────────┘   │
│                                                  │
│  ┌───────────────────────────────────────────┐   │
│  │            PLAYER SIDE                    │   │
│  │                                           │   │
│  │              [Sprite]                     │   │
│  │            Tu Personaje                   │   │
│  │   HP █████░  80/100    MP ███░░░  30/60   │   │
│  │   ⚔ ATK: 3d6   🛡 DEF: 2d6              │   │
│  └───────────────────────────────────────────┘   │
│                                                  │
│  ┌───────────────────────────────────────────┐   │
│  │  ⚔ Atacar  │ 📖 Doctrina │ 🧪 Item │ 🏃 Huir │
│  └───────────────────────────────────────────┘   │
│                                                  │
│  ┌───────────────────────────────────────────┐   │
│  │  Combat Log (scrollable, last 5 entries)  │   │
│  └───────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

### Action Flow

```
PLAYER TURN:
  1. Show action menu: Attack / Doctrine / Item / Flee
  2. Player selects action
     - Attack → select target enemy → dice roller → resolve
     - Doctrine → select doctrine → select target(s) → resolve
     - Item → select item → apply effect
     - Flee → roll escape check
  3. Animate result (CSS transitions + Framer Motion)
  4. Check for enemy death → spawn next enemy or victory
  5. Next turn

ENEMY TURN:
  1. AI selects action (attack or use ability)
  2. Animate enemy action
  3. Apply damage/effects to player
  4. Check for player death → game over
  5. Next turn
```

### Animations (Framer Motion + CSS)

| Animation       | Implementation                                                       |
| --------------- | -------------------------------------------------------------------- |
| Attack          | Unit slides forward → shake target → slide back                      |
| Damage number   | Float up with fade out (`animate={{ y: -40, opacity: 0 }}`)          |
| Death           | Fade out + fall (`animate={{ opacity: 0, y: 20 }}`)                  |
| Doctrine cast   | Glow effect on caster → particles on target(s)                       |
| Status effect   | Icon pulse on affected unit                                          |
| Turn transition | Subtle highlight shift between sides                                 |
| Hit flash       | Target flashes red briefly (`animate={{ filter: 'brightness(2)' }}`) |
| Heal            | Green number float + brief green glow                                |

---

## New Type System

Replace `shared/types/tactical-combat.types.ts` with simplified types:

```typescript
// No grid positions, no tiles, no terrain

export interface CombatUnit {
  id: string
  templateId: string
  name: string
  isPlayer: boolean
  spriteUrl?: string

  currentHealth: number
  maxHealth: number
  currentMana: number
  maxMana: number

  attackRange: number // kept for melee vs ranged distinction
  speed: number // turn order

  hasActed: boolean
  activeEffects: ActiveStatusEffect[]
}

export const CombatPhase = {
  SELECT_ACTION: 'select_action',
  SELECT_TARGET: 'select_target',
  SELECT_DOCTRINE: 'select_doctrine',
  SELECT_ITEM: 'select_item',
  ANIMATING: 'animating',
  ENEMY_TURN: 'enemy_turn',
  VICTORY: 'victory',
  DEFEAT: 'defeat'
} as const

export type CombatPhase = (typeof CombatPhase)[keyof typeof CombatPhase]

export type CombatAction = 'attack' | 'doctrine' | 'item' | 'flee'

export interface CombatState {
  playerUnit: CombatUnit
  enemyUnits: CombatUnit[]
  turnOrder: string[]
  currentTurnIndex: number
  turnNumber: number
  phase: CombatPhase
  selectedAction: CombatAction | null
  selectedTargetId: string | null
  selectedDoctrineId: string | null
  combatLog: CombatLogEntry[]
}

// Persistence (stored in ActivityParticipation.tacticalState)
export interface CombatStateData {
  stateVersion: number
  playerUnit: CombatUnit
  enemyUnits: CombatUnit[]
  turnOrder: string[]
  currentTurnIndex: number
  turnNumber: number
}
```

---

## Backend Changes

### Simplified Enemy AI

```typescript
// Current: check range → move toward player → check range again → attack
// New: choose action → execute

function decideEnemyAction(enemy: CombatUnit, player: CombatUnit): EnemyDecision {
  // 1. If has doctrine and enough mana → 30% chance to use it
  // 2. Otherwise → attack player
  return { action: 'attack', targetId: player.id }
}
```

### Router Changes

Remove these endpoints:

- `executeTacticalMove` (no movement)

Simplify these endpoints:

- `executeTacticalAttack` → remove range/position validation, keep dice resolution
- `executeTacticalDoctrine` → remove AoE grid calculation, use target selection
- `executeTacticalEnemyTurn` → remove movement phase

Keep as-is:

- `getTacticalState` (adapt shape)
- `useSelfBuffDoctrine`

### Doctrine Targeting Change

Current AoE patterns (CROSS, DIAMOND, LINE_3) become:

| Old Pattern | New Behavior                                    |
| ----------- | ----------------------------------------------- |
| SINGLE      | Target 1 enemy                                  |
| CROSS       | Target all enemies (reduced damage)             |
| DIAMOND     | Target all enemies (reduced damage)             |
| LINE_3      | Target 1 enemy + adjacent (if multiple enemies) |

This preserves the "some doctrines hit multiple targets" mechanic without a grid.

---

## Migration Plan

### Phase 1: New Combat UI Shell

**Goal:** Create the new React combat component with static layout.

1. Create `front/components/combat/combat-arena.component.tsx` - main container
2. Create `front/components/combat/enemy-display.component.tsx` - enemy side with sprites, HP bars, status effects
3. Create `front/components/combat/player-display.component.tsx` - player side with stats
4. Create `front/components/combat/combat-action-bar.component.tsx` - Attack/Doctrine/Item/Flee buttons
5. Reuse existing `health-bar.component.tsx`, `combat-log.component.tsx`
6. Add i18n keys for new UI strings

### Phase 2: New State Management

**Goal:** Replace the 1,668-line Zustand store with a simplified version.

1. Create `front/stores/combat.store.ts` (~400 lines) with:
   - `CombatState` (no grid, no tiles, no highlighting)
   - `initializeCombat()` / `hydrateFromState()`
   - `selectAction()` / `selectTarget()` / `selectDoctrine()`
   - `nextTurn()` / `resolveAction()`
   - Animation state (minimal: `isAnimating`, `animationType`, `animationTargetId`)
2. Write new shared types in `shared/types/combat.types.ts`

### Phase 3: Connect Backend

**Goal:** Wire the new UI to existing backend logic.

1. Simplify `activity.router.ts` endpoints (remove movement, simplify attack/doctrine)
2. Simplify `combat.service.ts` (remove position/range validation)
3. Simplify `enemy-ai.ts` (remove movement decision)
4. Adapt `attack-resolution.ts` (remove range checks)
5. Adapt `tactical-doctrine.ts` (replace AoE grid with multi-target selection)
6. Create new hooks:
   - `front/hooks/use-combat-attack.hook.ts`
   - `front/hooks/use-combat-doctrine.hook.ts`
   - `front/hooks/use-combat-enemy-turn.hook.ts`
7. Update tests in `server/__tests__/`

### Phase 4: Animations

**Goal:** Add Framer Motion animations for satisfying combat feel.

1. Attack animation (slide forward → impact → slide back)
2. Damage numbers (float up + fade)
3. Death animation (fade + fall)
4. Doctrine effects (glow + particle-like CSS)
5. Status effect application (icon pulse)
6. Turn transition indicators
7. Dice roller integration (keep existing component)

### Phase 5: Cleanup

**Goal:** Remove all Phaser 3 code and dependencies.

1. Delete `front/lib/phaser/` directory entirely
2. Delete `front/components/tactical/tactical-canvas.component.tsx`
3. Delete `front/components/tactical/tile-info-panel.component.tsx`
4. Delete `front/components/tactical/doctrine-target-selector.component.tsx`
5. Delete `front/hooks/use-tactical-move.hook.ts`
6. Delete `server/services/combat/tactical-movement.service.ts`
7. Delete `server/utils/combat/movement.ts`
8. Delete `shared/constants/terrain.ts`
9. Delete `shared/constants/aoe-patterns.ts`
10. Remove old `shared/types/tactical-combat.types.ts`
11. Remove old `front/stores/tactical-combat.store.ts`
12. Run `pnpm remove phaser` from `front/`
13. Update `tactical-combat-arena.component.tsx` to use new combat component (or replace entirely)
14. Deregister `TacticalMovementService` from `service.factory.ts`
15. Run `tsc --noEmit` to verify no broken imports
16. Run `pnpm test` to verify all tests pass

### Phase 6: Database Migration

**Goal:** Handle existing `tacticalState` data in the database.

1. Existing `ActivityParticipation.tacticalState` JSON fields contain grid-based state
2. Option A: Write a migration that resets active combats (simplest, low user impact)
3. Option B: Write a transformer that extracts unit data from old format into new format
4. Bump `stateVersion` to detect and auto-migrate old states

---

## Estimated Impact

| Metric                       | Before                         | After                             |
| ---------------------------- | ------------------------------ | --------------------------------- |
| Frontend combat lines        | ~4,500                         | ~1,500                            |
| Backend combat lines         | ~1,500                         | ~1,200                            |
| External dependencies        | phaser (~1MB)                  | framer-motion (already in use)    |
| Files in `front/lib/phaser/` | 7                              | 0                                 |
| Zustand store lines          | 1,668                          | ~400                              |
| Time to add new ability      | Touch 3+ layers                | Touch React + backend             |
| Mobile UX                    | Poor (tiny tiles, camera drag) | Good (large buttons, simple taps) |

---

## Risks & Mitigations

| Risk                                 | Mitigation                                                                                                                                         |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loss of visual spectacle             | Invest in Framer Motion animations; the grid was cool but underutilized                                                                            |
| Active combats in DB break           | Bump `stateVersion`, auto-reset or migrate old states                                                                                              |
| Doctrine AoE loses depth             | Multi-target selection preserves the "some hit all enemies" mechanic                                                                               |
| Speed/range stats become meaningless | Speed still determines turn order; range distinguishes melee vs ranged (melee could get counter-attack immunity, ranged could have bonus accuracy) |
| Movement range stat unused           | Repurpose as dodge chance or remove from weapons                                                                                                   |

---

## Open Questions

1. **Multiple player units?** Current system supports multiple player units on the grid. Pokemon-style is typically 1v1 or 1vN. Do we keep 1 player unit vs N enemies?
2. **Counter-attacks?** Current system has melee counter-attacks. Keep this? (Adds tactical depth without grid complexity)
3. **Flee mechanic?** What determines flee success? Speed-based roll?
4. **Item system?** Current system has consumables (potions). Keep the same interface or expand?
5. **Enemy variety per encounter?** Single enemy type or mixed groups?
