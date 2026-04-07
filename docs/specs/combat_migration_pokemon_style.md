# Migrating from Tactical Grid Combat to Turn-Based (Pokemon-Style) Combat

## Context

The current combat system is a **Final Fantasy Tactics-style tactical JRPG** built with Phaser 3 for isometric grid rendering, Dijkstra/A\* pathfinding, and sprite-based animations. While fully functional, the complexity of maintaining a Phaser 3 integration inside a Next.js app is disproportionate for a productivity platform.

This document proposes migrating to a **Pokemon-style turn-based combat system** built entirely in React + CSS/Framer Motion, eliminating Phaser 3 as a dependency.

---

## Why Migrate

### Problems with the current approach

1. **Phaser 3 is overkill.** Covenant is a gamified productivity app, not a tactics game. The isometric grid, pathfinding (Dijkstra + A\*), camera drag-to-pan, and sprite tween system add ~3,000 lines of rendering code for minimal gameplay value.

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
6. **Consistent with Covenant's UI** - uses the same design system as the rest of the app

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
| `front/stores/tactical-combat.store.ts`                         | 1,668         | Combat state      | DELETE entirely — replaced by `useCombat` hook + TanStack Query |
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
│  │  ⚔ Atacar  │ 📖 Doctrina │ 🧪 Item            │
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
  1. Reset potionUsedThisTurn = false
  2. Show action menu: Attack / Doctrine / Potion
  3. Player selects action
     - Attack → select target enemy → dice roller → resolve → end turn
     - Doctrine → select doctrine → select target(s) → resolve → end turn
     - Potion → select potion type → apply effect → end turn
  4. Animate result (CSS transitions + Framer Motion)
  5. Check for enemy death → spawn next enemy or victory
  6. Next turn (enemies)

ENEMY TURN:
  1. Each living enemy acts sequentially (iterate enemyUnits)
  2. AI selects action (attack or use ability)
  3. Animate enemy action
  4. Apply damage/effects to player
  5. Check for player death → game over
  6. After all enemies have acted → next turn (player)
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
// No grid positions, no tiles, no terrain, no melee/ranged distinction

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

  speed: number // determines turn order

  activeEffects: ActiveStatusEffect[]
}

// Only 5 phases — sub-selection state (which target, which doctrine, which potion)
// is local UI state in the action bar component, NOT global store state.
export const CombatPhase = {
  PLAYER_INPUT: 'player_input',
  ANIMATING: 'animating',
  ENEMY_TURN: 'enemy_turn',
  VICTORY: 'victory',
  DEFEAT: 'defeat'
} as const

export type CombatPhase = (typeof CombatPhase)[keyof typeof CombatPhase]

export type CombatAction = 'attack' | 'doctrine' | 'item'

// Single interface for runtime and persistence.
// Transient fields (phase, combatLog) are initialized with defaults on hydration.
export interface CombatState {
  stateVersion: number
  playerUnit: CombatUnit
  enemyUnits: CombatUnit[]
  isPlayerTurn: boolean // simple alternation, no turnOrder array needed
  turnNumber: number
  phase: CombatPhase
  potionUsedThisTurn: boolean // max 1 potion per turn
  combatLog: CombatLogEntry[]
}
```

---

## Backend Changes

### Defense Dice

All attacks always roll defense dice. No melee/ranged distinction — without a spatial grid, the concept is artificial. If an enemy should be easier/harder to hit, adjust their defense dice count directly in their stats.

In `attack-resolution.ts`, remove all range-based and attackType-based checks. Defense dice are always rolled.

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
- `executeTacticalDoctrine` → remove AoE grid calculation, use `single`/`all` targeting
- `executeTacticalEnemyTurn` → remove movement phase, iterate all enemies sequentially

Add endpoint:

- `usePotion` → validate potion in inventory + `potionUsedThisTurn === false`, apply HP/MP restore, set flag

Keep as-is:

- `getTacticalState` (adapt shape)
- `useSelfBuffDoctrine`

### Doctrine Targeting Change

Collapse all AoE patterns into two simple targeting modes:

| Targeting | Behavior                                           |
| --------- | -------------------------------------------------- |
| `single`  | Target 1 enemy                                     |
| `all`     | Target all enemies (reduced damage, e.g. 0.6x)     |

All old patterns (SINGLE, CROSS, DIAMOND, LINE_3) map to one of these two. Update doctrine definitions in `shared/constants/doctrines.ts` directly.

### Potion System

Players can consume **1 potion per turn** as their action. Two potion types:

| Potion       | Effect                    |
| ------------ | ------------------------- |
| Health Potion | Restores a fixed amount of HP |
| Mana Potion   | Restores a fixed amount of MP |

Using a potion consumes the player's action for that turn (no attack or doctrine). The `potionUsedThisTurn` flag resets at the start of each player turn. Backend validates that the player has the potion in inventory and hasn't already used one this turn.

---

## Migration Plan

### Phase 1: New Combat UI Shell

**Goal:** Create the new React combat component with static layout.

1. Create `front/components/combat/combat-arena.component.tsx` - main container
2. Create `front/components/combat/enemy-display.component.tsx` - enemy side with sprites, HP bars, status effects
3. Create `front/components/combat/player-display.component.tsx` - player side with stats
4. Create `front/components/combat/combat-action-bar.component.tsx` - Attack/Doctrine/Item buttons
5. Reuse existing `health-bar.component.tsx`, `combat-log.component.tsx`
6. Add i18n keys for new UI strings

### Phase 2: New State Management

**Goal:** Eliminate the 1,668-line Zustand store entirely. Combat state is server-authoritative — use TanStack Query as the single source of truth, with local `useState` for transient UI state.

**No Zustand store.** The combat state lives on the server and is fetched/mutated via tRPC. There is no need for a client-side Zustand store that duplicates and synchronizes server state — this was the root cause of the complexity in the current system (React ↔ Phaser ↔ Zustand three-way sync).

1. Create `front/hooks/use-combat.hook.ts` — custom hook that encapsulates all combat logic:
   - Server state via `useSuspenseQuery(trpcOptions.activity.getTacticalState.queryOptions(...))`
   - Mutations via `useMutation(trpcOptions.activity.executeTacticalAttack.mutationOptions(...))`
   - Animation state as local `useState` (`animationType`, `animationTargetId`, `isAnimating`)
   - On mutation success: trigger animation → after animation completes, invalidate query to refresh state
   - Exposes: `{ combat, animation, attack, castDoctrine, usePotion, isAnimating }`
2. Sub-selection state (selected action, target picker, doctrine picker) stays as local `useState` in `combat-action-bar.component.tsx`
3. Write new shared types in `shared/types/combat.types.ts`

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
   - `front/hooks/use-combat-potion.hook.ts`
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
| Zustand store lines          | 1,668                          | 0 (replaced by `useCombat` hook)  |
| Time to add new ability      | Touch 3+ layers                | Touch React + backend             |
| Mobile UX                    | Poor (tiny tiles, camera drag) | Good (large buttons, simple taps) |

---

## Risks & Mitigations

| Risk                                 | Mitigation                                                                                                                                         |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loss of visual spectacle             | Invest in Framer Motion animations; the grid was cool but underutilized                                                                            |
| Active combats in DB break           | Bump `stateVersion`, auto-reset or migrate old states                                                                                              |
| Doctrine AoE loses depth             | Multi-target selection preserves the "some hit all enemies" mechanic                                                                               |
| Speed stat balance                   | Speed determines turn order; defense dice count per enemy provides stat variety                                                                     |
| Movement range stat unused           | Remove from weapons (no longer relevant)                                                                                                           |

---

## Decisions

1. **1 player vs N enemies.** Combat is always 1 player unit against multiple enemies. No flee option — the player must fight to victory or defeat.
2. **No melee/ranged distinction.** All attacks roll defense dice. Enemy difficulty is controlled via their defense dice count in stats, not via an attackType flag.
3. **Simple turn alternation.** Player turn → all enemies act → player turn. No turn order array — just `isPlayerTurn` boolean + sequential enemy iteration.
4. **5 combat phases.** `PLAYER_INPUT → ANIMATING → ENEMY_TURN → VICTORY → DEFEAT`. Sub-selection state (target, doctrine, potion) is local UI state via `useState`.
5. **1 potion per turn.** Player can use a health or mana potion as their action. Using a potion ends the turn (no attack or doctrine that turn).
6. **Two doctrine targeting modes.** `single` (1 enemy) and `all` (all enemies, 0.6x damage). No intermediate patterns.
7. **Single state interface.** No separate `CombatState` / `CombatStateData` — one interface, transient fields get defaults on hydration.
8. **No Zustand store.** Combat state is server-authoritative. TanStack Query (via tRPC) is the single source of truth. Animation and sub-selection state use local `useState`. This eliminates the React ↔ Store sync layer entirely.

## Open Questions

1. **Counter-attacks?** Current system has melee counter-attacks. Keep this? (Adds tactical depth without grid complexity)
2. **Enemy variety per encounter?** Single enemy type or mixed groups?
