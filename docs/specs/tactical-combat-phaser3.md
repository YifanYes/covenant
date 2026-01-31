# Tactical Combat System with Phaser 3

## Overview

This document describes the tactical combat system implemented in ARQ. The system transforms basic dice-based combat into a **Final Fantasy Tactics-style tactical JRPG** using Phaser 3 for rendering and animations, while preserving the existing backend combat resolution mechanics.

## Goals

1. Transform basic combat UI into an immersive tactical experience
2. Utilize existing weapon `range` and `speed` stats meaningfully
3. Enable area-of-effect doctrines with spatial targeting
4. Maintain the core dice-based combat mechanics
5. Create a pixel art aesthetic consistent with ARQ's RPG theme

---

## Architecture

### Hybrid React + Phaser Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                    React Application                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              TacticalCombatView                       │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │  │
│  │  │TurnOrder    │  │ActionMenu   │  │CombatLog    │    │  │
│  │  │Display      │  │             │  │             │    │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘    │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │           Phaser Canvas (z-index: 0)            │  │  │
│  │  │  ┌─────────────────────────────────────────┐    │  │  │
│  │  │  │            CombatScene                  │    │  │  │
│  │  │  │  - Isometric Grid                       │    │  │  │
│  │  │  │  - Unit Sprites                         │    │  │  │
│  │  │  │  - Animations                           │    │  │  │
│  │  │  │  - Tile Highlights                      │    │  │  │
│  │  │  └─────────────────────────────────────────┘    │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────┐  ┌─────────────┐                     │  │
│  │  │DiceRoller   │  │DoctrinePanel│  (React Overlays)   │  │
│  │  └─────────────┘  └─────────────┘                     │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Zustand Store                            │
│  - Grid state          - Turn queue                         │
│  - Unit positions      - Selected tile                      │
│  - Combat results      - Current phase                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    tRPC Backend                             │
│  - CombatService (dice resolution + tactical methods)       │
└─────────────────────────────────────────────────────────────┘
```

### Why This Pattern?

| Decision          | Choice           | Rationale                                       |
| ----------------- | ---------------- | ----------------------------------------------- |
| State management  | Zustand (shared) | Already used in project, Phaser can subscribe   |
| Dice rolling UI   | Keep in React    | Preserves existing components, modal-style UI   |
| Combat resolution | Backend          | Prevents cheating, preserves integrity          |
| Grid rendering    | Phaser           | Optimized for game graphics and animations      |
| UI overlays       | React            | Easier styling with Tailwind, consistent design |

We chose a hybrid approach because:

1. **Phaser excels at real-time rendering** - Isometric grids, sprite animations, and particle effects are much easier in Phaser than in React
2. **React excels at UI** - Menus, health bars, turn order displays work well with Tailwind CSS
3. **Zustand bridges both worlds** - Phaser subscribes directly to the store, React components use hooks

---

## File Structure

### Phaser Layer

| File                                                                                       | Purpose                                                                                                     |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| [`front/lib/phaser/config.ts`](../../front/lib/phaser/config.ts)                           | Tile dimensions, canvas size, camera settings, depth layers                                                 |
| [`front/lib/phaser/game-instance.ts`](../../front/lib/phaser/game-instance.ts)             | SSR-safe Phaser game singleton with dynamic imports                                                         |
| [`front/lib/phaser/scenes/boot-scene.ts`](../../front/lib/phaser/scenes/boot-scene.ts)     | Asset loading (sprites, particle textures)                                                                  |
| [`front/lib/phaser/scenes/combat-scene.ts`](../../front/lib/phaser/scenes/combat-scene.ts) | Main scene: grid rendering, unit management, animations, input handling                                     |
| [`front/lib/phaser/entities/unit.ts`](../../front/lib/phaser/entities/unit.ts)             | Unit sprites with health bars, animations (idle breathing, movement, attack, death), status effect overlays |
| [`front/lib/phaser/systems/grid-system.ts`](../../front/lib/phaser/systems/grid-system.ts) | Isometric grid rendering, coordinate conversion, tile highlighting                                          |
| [`front/lib/phaser/systems/pathfinding.ts`](../../front/lib/phaser/systems/pathfinding.ts) | Dijkstra (movement range), A\* (path calculation), AoE calculations                                         |

### React Layer

| File                                                                                                                                   | Purpose                                                     |
| -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| [`front/stores/tactical-combat.store.ts`](../../front/stores/tactical-combat.store.ts)                                                 | Central state store - units, tiles, phases, pending actions |
| [`front/components/tactical/tactical-canvas.component.tsx`](../../front/components/tactical/tactical-canvas.component.tsx)             | Phaser canvas wrapper with lifecycle management             |
| [`front/components/tactical/tactical-combat-arena.component.tsx`](../../front/components/tactical/tactical-combat-arena.component.tsx) | Main arena component coordinating all UI elements           |
| [`front/components/tactical/action-menu.component.tsx`](../../front/components/tactical/action-menu.component.tsx)                     | Move/Attack/Doctrine/Wait action buttons                    |
| [`front/components/tactical/turn-order-display.component.tsx`](../../front/components/tactical/turn-order-display.component.tsx)       | Shows turn queue with unit portraits                        |
| [`front/hooks/use-tactical-move.hook.ts`](../../front/hooks/use-tactical-move.hook.ts)                                                 | Handles movement execution via tRPC                         |
| [`front/hooks/use-tactical-attack.hook.ts`](../../front/hooks/use-tactical-attack.hook.ts)                                             | Handles attack execution with dice integration              |
| [`front/hooks/use-tactical-doctrine.hook.ts`](../../front/hooks/use-tactical-doctrine.hook.ts)                                         | Handles doctrine casting with AoE targeting                 |
| [`front/hooks/use-tactical-enemy-turn.hook.ts`](../../front/hooks/use-tactical-enemy-turn.hook.ts)                                     | Executes enemy AI turns automatically                       |

### Backend Layer

| File                                                                                                                         | Purpose                                                                                                                           |
| ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| [`server/services/combat.service.ts`](../../server/services/combat.service.ts)                                               | Movement validation, attack resolution, doctrine effects, enemy AI                                                                |
| [`server/routers/activity.router.ts`](../../server/routers/activity.router.ts)                                               | tRPC endpoints: `getTacticalState`, `executeTacticalMove`, `executeTacticalAttack`, `executeTacticalDoctrine`, `executeEnemyTurn` |
| [`server/repositories/activity-participation.repository.ts`](../../server/repositories/activity-participation.repository.ts) | Persists tactical state to database                                                                                               |

### Shared Types

| File                                                                                   | Purpose                                                                                |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| [`shared/types/tactical-combat.types.ts`](../../shared/types/tactical-combat.types.ts) | All TypeScript types: `TacticalUnit`, `TileState`, `TacticalCombatState`, result types |
| [`shared/constants/terrain.ts`](../../shared/constants/terrain.ts)                     | Terrain movement costs and effects                                                     |
| [`shared/constants/aoe-patterns.ts`](../../shared/constants/aoe-patterns.ts)           | AoE pattern definitions for doctrines                                                  |

---

## How It Works

### Grid System

**Isometric rendering** with diamond-shaped tiles:

```
Grid Type: Isometric (diamond orientation)
Default Size: 8x6 tiles
Tile Size: 64x32 pixels (width x height)

Coordinate System:
- (0,0) at top corner
- X increases down-right
- Y increases down-left
```

The grid system ([`grid-system.ts`](../../front/lib/phaser/systems/grid-system.ts)) converts between grid and screen coordinates. We chose isometric because it gives depth perception while keeping the tactical clarity of a grid-based system.

### Turn Order

Units are sorted by speed at combat start and take turns in round-robin fashion:

1. **Higher speed → earlier turn** (from weapon stats)
2. **Player units win ties** (player-friendly tiebreaker)
3. Turn state (`hasMoved`, `hasActed`) resets each turn

The turn queue lives in the Zustand store. When `phase` is `'enemy_turn'`, the [`use-tactical-enemy-turn.hook.ts`](../../front/hooks/use-tactical-enemy-turn.hook.ts) automatically triggers enemy AI.

### Movement System

Movement uses **two algorithms**:

1. **Dijkstra's Algorithm** - When you select "Move", calculates all reachable tiles within movement budget, respecting terrain costs
2. **A\* Algorithm** - When you click a destination, finds the optimal path for the animation

See [`pathfinding.ts`](../../front/lib/phaser/systems/pathfinding.ts) for implementation.

**Why two algorithms?**

- Dijkstra efficiently finds _all_ reachable tiles (no specific destination)
- A* efficiently finds *one\* optimal path (known destination)

Movement is validated on the backend to prevent cheating. The frontend shows the preview, backend confirms validity.

### Range Mechanics

Uses **Manhattan distance** (no diagonals count as 2):

| Weapon Type           | Range | Notes               |
| --------------------- | ----- | ------------------- |
| Melee (sword, hammer) | 1     | Adjacent tiles only |
| Ranged (pistol)       | 2-3   | Medium range        |
| Magic (wand)          | 2     | Medium range        |
| Magic (grimoire)      | 3     | Medium-long range   |

**Line of Sight is intentionally not implemented.** This keeps combat simple and prevents frustrating "I can see them but can't hit them" situations.

### Area of Effect (AoE)

Doctrines can have AoE patterns defined in [`aoe-patterns.ts`](../../shared/constants/aoe-patterns.ts):

| Pattern | Shape                             | Example Doctrine |
| ------- | --------------------------------- | ---------------- |
| SINGLE  | Single target                     | Igneous Cut      |
| CROSS   | + shape                           | Disruption Storm |
| DIAMOND | 3x3 diamond                       | Fireball         |
| LINE_3  | Line of 3 (rotates toward caster) | Lightning Burst  |

When targeting, the UI shows:

1. **Purple tiles** - Valid casting range
2. **Selected tiles** - AoE preview at hover position

### Combat Resolution

Attacks use the existing dice system:

1. Player selects target in range
2. Frontend triggers dice roller UI
3. Dice results sent to backend
4. Backend validates and resolves damage
5. Frontend plays attack animation with damage numbers

Counter-attacks happen automatically when a melee enemy survives being hit.

### Enemy AI

Simple but effective decision tree in [`combat.service.ts`](../../server/services/combat.service.ts):

1. **If in range** → Attack
2. **If not in range** → Move toward player, then attack if now in range
3. **If can't reach** → Move as close as possible

The AI runs entirely on the backend. Frontend just plays the animations.

### Animation Flow

The [`CombatScene`](../../front/lib/phaser/scenes/combat-scene.ts) subscribes to the Zustand store. When state changes:

1. Store sets `phase: 'animating'` and animation data
2. Scene detects the change in `syncWithState()`
3. Scene plays the appropriate animation (movement, attack, doctrine)
4. When animation completes, scene calls store method (e.g., `completeAttackAnimation()`)
5. Store updates state, unlocking the next action

This pattern ensures animations block user input and complete before state updates.

### Visual Effects

The [`Unit`](../../front/lib/phaser/entities/unit.ts) class handles:

- **Idle breathing** - Subtle scale oscillation on all units
- **Bounce animation** - Active/selected units bounce
- **Damage shake** - Units shake and flash red when hit
- **Death animation** - Fade and fall when killed
- **Status effect overlays** - Particle emitters for burn, poison, freeze, etc.

The [`CombatScene`](../../front/lib/phaser/scenes/combat-scene.ts) handles:

- **Screen shake** - Camera shake on heavy hits/deaths
- **Hit sparks** - Particle burst on melee impacts
- **Spell effects** - Element-specific particles (fire embers, ice shards, lightning arcs, etc.)
- **Floating damage/heal numbers**

---

## Terrain Types

| Terrain  | Movement Cost | Walkable | Special Effect              |
| -------- | ------------- | -------- | --------------------------- |
| Grass    | 1             | Yes      | None                        |
| Stone    | 1             | Yes      | None                        |
| Water    | 2             | Yes      | -1 movement next turn (wet) |
| Lava     | 2             | Yes      | 1 damage per turn           |
| Obstacle | -             | No       | Blocks movement             |

---

## State Persistence

Tactical state is persisted in the `ActivityParticipation.tacticalState` JSON field:

```typescript
interface TacticalStateData {
  mapTemplateId: string
  gridWidth: number
  gridHeight: number
  tiles: TileState[][]
  units: TacticalUnitState[]
  turnOrder: string[]
  currentTurnIndex: number
  turnNumber: number
}
```

This allows combat to be resumed if the player closes the browser.

---

## Enemy Scaling System

The enemy scaling system ensures combat difficulty scales appropriately with character progression. It uses a hybrid approach combining encounter sequence patterns, enemy pool filtering, and stat scaling.

### Encounter Patterns

Each character tier has a defined encounter pattern that determines the sequence of enemy types faced:

| Tier | Pattern | Description |
|------|---------|-------------|
| 1 | `[MINION, MINION?]` | 1 minion, 30% chance for 2nd |
| 2 | `[MINION, MINION, ELITE]` | 2 minions then 1 elite |
| 3 | `[MINION, ELITE, MINION?, BOSS?]` | 1 minion, 1 elite, 40% for each optional |
| 4 | `[ELITE, MINION, ELITE, BOSS]` | Hard encounters with guaranteed boss |

Patterns are generated when joining an activity and stored in `ActivityParticipation.combatStats`:

```typescript
interface EncounterState {
  encounterPattern: ResolvedEncounterSlot[]  // Resolved sequence (optional slots rolled)
  encounterIndex: number                      // Current position in sequence
  sessionStartedAt: string                    // ISO timestamp
}
```

When the sequence completes, a new pattern is generated.

### Enemy Selection

Enemies are selected using a fallback chain:

1. **Match type AND tier** - Filter activity's spawn weights by required type (from pattern) and tier ≤ character tier
2. **Match any type at tier** - If no match, try any type at tier ≤ character tier
3. **Original behavior** - If still no match, use original weighted random selection (no tier filtering)

This ensures activities always spawn enemies while respecting the encounter pattern when possible.

### Stat Scaling

When a character's tier exceeds the enemy's tier, the enemy receives scaled stats to remain challenging:

| Tier Difference | Multiplier | Scaled Stats |
|-----------------|------------|--------------|
| 0 | 1.0x | No scaling |
| 1 | 1.15x | health, mana, strengthDef, magicDef, goldReward |
| 2 | 1.25x | health, mana, strengthDef, magicDef, goldReward |
| 3+ | 1.35x | health, mana, strengthDef, magicDef, goldReward |

Note: Offensive stats (attack, dice) are not scaled to avoid making enemies overly punishing.

### Related Files

| File | Purpose |
|------|---------|
| [`shared/constants/encounter-patterns.ts`](../../shared/constants/encounter-patterns.ts) | Pattern definitions and sequence generation |
| [`shared/constants/enemies.ts`](../../shared/constants/enemies.ts) | Stat scaling multipliers and `applyStatScaling()` |
| [`shared/constants/activities.ts`](../../shared/constants/activities.ts) | Enemy filtering and fallback selection |
| [`server/services/activity.service.ts`](../../server/services/activity.service.ts) | Encounter initialization on activity join |
| [`server/services/combat.service.ts`](../../server/services/combat.service.ts) | Encounter progression on enemy defeat |

---

## Implementation Status

All phases are complete:

- ✅ **Phase 1: Foundation** - Phaser integration, isometric grid, Zustand store
- ✅ **Phase 2: Units & Selection** - Unit sprites, tile clicking, movement range highlighting
- ✅ **Phase 3: Movement** - Pathfinding, backend validation, walking animation
- ✅ **Phase 4: Combat Integration** - Range validation, dice roller integration, attack animations
- ✅ **Phase 5: Doctrine AoE** - AoE patterns, doctrine targeting UI, spell effects
- ✅ **Phase 6: Enemy AI** - AI decision tree, automatic enemy turns
- ✅ **Phase 7: Polish** - Screen shake, idle breathing, hit sparks, status effect overlays, spell particles

---

## Future Considerations

Features deferred for later phases:

- **Elevation system** - Height-based damage bonuses and movement costs
- **Line of Sight** - Bresenham's algorithm for ranged attack validation
- **Procedural maps** - Generate maps based on activity type and difficulty
- **Larger battles** - Architecture supports 6+ units, but UI needs adaptation
- **Object pooling** - Pool floating text and particles for performance
- **Tile culling** - Only render tiles within camera viewport

---

## References

- [Phaser 3 Documentation](https://photonstorm.github.io/phaser3-docs/)
- [A\* Pathfinding Algorithm](https://www.redblobgames.com/pathfinding/a-star/introduction.html)
- [Isometric Coordinates](https://www.redblobgames.com/grids/hexagons/)
