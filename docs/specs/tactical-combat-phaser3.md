# Tactical Combat System with Phaser 3

## Overview

This specification outlines the integration of Phaser 3 into Arq to transform the current dice-based reactive combat into a **Final Fantasy Tactics-style tactical JRPG**. The system preserves existing backend combat resolution while adding grid-based movement, positioning, and range mechanics.

## Goals

1. Transform basic combat UI into an immersive tactical experience
2. Utilize existing weapon `range` and `speed` stats meaningfully
3. Enable area-of-effect doctrines with spatial targeting
4. Maintain the core dice-based combat mechanics
5. Create a pixel art aesthetic consistent with Arq's RPG theme

## Current System Analysis

### What Exists

| Feature                     | Status             | Location                            |
| --------------------------- | ------------------ | ----------------------------------- |
| Dice-based combat           | Implemented        | `combat.service.ts`                 |
| Reactive turn flow          | Implemented        | `use-combat-turn.hook.ts`           |
| Doctrines (spells)          | Implemented        | `doctrines.ts`, `combat.service.ts` |
| Status effects              | Implemented        | `gamification.types.ts`             |
| Weapon stats (range, speed) | Defined but unused | `items.ts`                          |
| Multiple enemies (3)        | Implemented        | `combat-arena.component.tsx`        |
| Initiative system           | Implemented        | Based on weapon speed               |

### What's Missing for Tactical Combat

- Grid-based positioning
- Movement mechanics
- Range validation for attacks
- Area of effect targeting
- Turn order visualization
- Tactical animations

---

## Architecture

### Hybrid React + Phaser Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                    React Application                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              TacticalCombatView                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │   │
│  │  │TurnOrder    │  │ActionMenu   │  │CombatLog    │ │   │
│  │  │Display      │  │             │  │             │ │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘ │   │
│  │  ┌─────────────────────────────────────────────────┐│   │
│  │  │           Phaser Canvas (z-index: 0)            ││   │
│  │  │  ┌─────────────────────────────────────────┐   ││   │
│  │  │  │            CombatScene                   │   ││   │
│  │  │  │  - Isometric Grid                       │   ││   │
│  │  │  │  - Unit Sprites                         │   ││   │
│  │  │  │  - Animations                           │   ││   │
│  │  │  │  - Tile Highlights                      │   ││   │
│  │  │  └─────────────────────────────────────────┘   ││   │
│  │  └─────────────────────────────────────────────────┘│   │
│  │  ┌─────────────┐  ┌─────────────┐                   │   │
│  │  │DiceRoller   │  │DoctrinePanel│  (React Overlays) │   │
│  │  └─────────────┘  └─────────────┘                   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Zustand Store                             │
│  - Grid state          - Turn queue                         │
│  - Unit positions      - Selected tile                      │
│  - Combat results      - Current phase                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    tRPC Backend                              │
│  - CombatService (dice resolution + tactical methods)       │
└─────────────────────────────────────────────────────────────┘
```

### Key Decisions

| Decision            | Choice                  | Rationale                                       |
| ------------------- | ----------------------- | ----------------------------------------------- |
| State management    | Zustand (shared)        | Already used in project, Phaser can subscribe   |
| Dice rolling UI     | Keep in React           | Preserves existing components, modal-style UI   |
| Combat resolution   | Backend                 | Prevents cheating, preserves integrity          |
| Grid rendering      | Phaser                  | Optimized for game graphics and animations      |
| UI overlays         | React                   | Easier styling with Tailwind, consistent design |
| Inventory/Shop      | React (separate)        | Management screens, no real-time rendering      |
| In-combat inventory | Phaser overlay (future) | Maintains immersion during battle               |

---

## Tactical Combat Mechanics

### Grid System

```
Grid Type: Isometric (diamond orientation)
Default Size: 12x8 tiles
Tile Size: 64x32 pixels (isometric diamond: width x height)

Coordinate System:
- (0,0) at top corner
- X increases down-right
- Y increases down-left
```

**Isometric Conversion:**

```typescript
function gridToScreen(gridX: number, gridY: number): { x: number; y: number } {
  const TILE_WIDTH = 64 // Isometric tile width
  const TILE_HEIGHT = 32 // Isometric tile height

  return {
    x: (gridX - gridY) * (TILE_WIDTH / 2) + offsetX,
    y: (gridX + gridY) * (TILE_HEIGHT / 2) + offsetY
  }
}
```

### Terrain Types

| Terrain          | Movement Cost | Walkable | Special Effect              |
| ---------------- | ------------- | -------- | --------------------------- |
| Grass            | 1             | Yes      | None                        |
| Stone            | 1             | Yes      | None                        |
| Water            | 2             | Yes      | -1 movement next turn (wet) |
| Lava / Corrupted | 2             | Yes      | 1 damage per turn           |
| Obstacle         | -             | No       | Blocks movement             |

### Turn Order System (Round-Robin)

Simple initiative-based turn order, sorted once at combat start:

```typescript
interface TurnOrder {
  units: TacticalUnit[]
  currentIndex: number
}

// Sort at combat start (higher speed goes first)
function initializeTurnOrder(units: TacticalUnit[]): TurnOrder {
  const sorted = [...units].sort((a, b) => {
    // Primary: speed (descending)
    const speedDiff = b.speed - a.speed
    if (speedDiff !== 0) return speedDiff
    // Tiebreaker: player units go first
    return a.isPlayer ? -1 : 1
  })

  return { units: sorted, currentIndex: 0 }
}

// Advance to next unit
function nextTurn(order: TurnOrder): TacticalUnit {
  order.currentIndex = (order.currentIndex + 1) % order.units.length
  return order.units[order.currentIndex]
}
```

**Speed Values (from weapons):**

| Weapon Type | Speed | Turn Priority |
| ----------- | ----- | ------------- |
| Dagger      | 3     | Fastest       |
| Sword       | 2     | Medium        |
| Hammer      | 1     | Slowest       |
| Wand        | 2     | Medium        |
| Grimoire    | 1     | Slowest       |

### Movement System

```typescript
interface MovementConfig {
  baseMovement: 3        // All units start with 3 tiles
  armorPenalty: -1       // Heavy armor reduces by 1
  statusEffects: {
    IMMOBILIZED: 0,      // Cannot move
    HASTE: +2,           // Bonus movement
    SLOW: -1             // Reduced movement
  }
}
```

**Pathfinding:** Hybrid approach using two algorithms:

1. **Dijkstra's Algorithm** - For calculating movement range
   - Explores all reachable tiles within movement budget
   - Respects terrain movement costs
   - Used when unit is selected to highlight reachable tiles
   - Obstacles can be pre-filtered or ignored (impassable tiles excluded from result)

2. **A\* Algorithm** - For path calculation to selected destination
   - Finds optimal path once player clicks a destination tile
   - Uses Manhattan distance heuristic for grid-based movement
   - Considers occupied tiles (cannot pass through enemies)
   - Used for movement animation path

**Movement considerations:**

- Terrain movement costs (grass=1, water=2, lava=2)
- Diagonal movement allowed (cost 1.4)
- Allies can be passed through, enemies block movement

### Range Mechanics

Using existing `range` stat from weapons. Range is calculated using Manhattan distance (no diagonal shortcuts).

| Weapon Type           | Range | Notes               |
| --------------------- | ----- | ------------------- |
| Melee (sword, hammer) | 1     | Adjacent tiles only |
| Ranged (pistol)       | 2-3   | Medium range        |
| Ranged (musket)       | 3-5   | Long range          |
| Magic (wand)          | 2     | Medium range        |
| Magic (grimoire)      | 3     | Medium-long range   |

**Range Calculation:**

```typescript
function isInRange(from: GridPosition, to: GridPosition, range: number): boolean {
  const distance = Math.abs(from.x - to.x) + Math.abs(from.y - to.y)
  return distance <= range
}

function getTilesInRange(center: GridPosition, range: number, grid: TileState[][]): GridPosition[] {
  const tiles: GridPosition[] = []
  for (let dx = -range; dx <= range; dx++) {
    for (let dy = -range; dy <= range; dy++) {
      if (Math.abs(dx) + Math.abs(dy) <= range) {
        const x = center.x + dx
        const y = center.y + dy
        if (x >= 0 && x < grid[0].length && y >= 0 && y < grid.length) {
          tiles.push({ x, y })
        }
      }
    }
  }
  return tiles
}
```

> **Note:** Line of Sight is deferred to a future phase. For v1, all attacks within range are valid.

### Area of Effect Patterns

For doctrines with multi-target effects:

```typescript
const AoE_PATTERNS = {
  SINGLE: [[0, 0]],                           // Single target

  CROSS: [                                     // + shape
    [0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]
  ],

  DIAMOND: [                                   // Diamond 3x3
    [0, 0],
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [1, -1], [-1, 1], [-1, -1]
  ],

  LINE_3: [[0, 0], [1, 0], [2, 0]],           // Line of 3 (rotatable)

  CONE: [                                      // Cone spread
    [1, 0], [2, 0], [2, 1], [2, -1]
  ],

  CIRCLE_2: /* radius 2 circle */
}
```

**Doctrine AoE Mapping:**
| Doctrine | Pattern | Size |
|----------|---------|------|
| Igneous Cut | SINGLE | 1 |
| Fireball | DIAMOND | 3x3 |
| Lightning Burst | LINE_3 | 3 |
| Black Hole | CIRCLE_2 | 5x5 |
| Disruption Storm | CROSS | 5 |

---

## Data Structures

### New Types (`shared/types/tactical-combat.types.ts`)

```typescript
export interface GridPosition {
  x: number
  y: number
}

export interface TacticalUnit {
  id: string
  templateId: string // Enemy template ID or 'player'
  name: string
  position: GridPosition
  isPlayer: boolean

  // Stats (from character/enemy)
  currentHealth: number
  maxHealth: number
  currentMana: number
  maxMana: number

  // Tactical stats
  movementRange: number // Tiles can move
  attackRange: number // From weapon
  speed: number // For turn order (higher = earlier)

  // Turn state
  hasMoved: boolean
  hasActed: boolean

  // Status
  activeEffects: ActiveStatusEffect[]
}

export interface TileState {
  position: GridPosition
  terrain: TerrainType
  occupantId: string | null
  isWalkable: boolean
}

export interface TacticalCombatState {
  // Grid
  gridWidth: number
  gridHeight: number
  tiles: TileState[][]

  // Units
  playerUnits: TacticalUnit[]
  enemyUnits: TacticalUnit[]

  // Turn management
  turnQueue: TacticalUnit[]
  activeUnitId: string | null
  turnNumber: number

  // UI state
  phase: TacticalPhase
  selectedTile: GridPosition | null
  highlightedTiles: HighlightedTile[]
  pendingAction: TacticalAction | null
}

export type TacticalPhase =
  | 'select_action' // Unit's turn, choosing action
  | 'select_move' // Choosing movement destination
  | 'select_target' // Choosing attack/doctrine target
  | 'animating' // Playing animation
  | 'enemy_turn' // AI processing

export interface TacticalAction {
  type: 'move' | 'attack' | 'doctrine' | 'item' | 'wait'
  path?: GridPosition[] // For movement
  targetPosition?: GridPosition // For attacks/doctrines
  targetUnitIds?: string[] // Affected units
  doctrineId?: string
  itemId?: string
}
```

### Database Changes

```prisma
// Add to ActivityParticipation
model ActivityParticipation {
  // ... existing fields ...

  // Tactical combat state (JSON) - single source of truth
  tacticalState     Json?     @default("{}")
  // {
  //   mapTemplateId: string,
  //   gridWidth: number,
  //   gridHeight: number,
  //   tiles: TileState[][],
  //   units: {
  //     id: string,
  //     position: { x, y },
  //     hasMoved: boolean,
  //     hasActed: boolean
  //   }[],
  //   turnOrder: string[],        // Unit IDs in turn order
  //   currentTurnIndex: number,
  //   turnNumber: number
  // }
}

// No changes to CombatEnemy - all tactical state lives in tacticalState JSON
```

---

## File Structure

```
front/
├── app/(workspace)/map/
│   ├── activity/[id]/
│   │   └── page.tsx              # Add tactical mode switch
│   └── _components/
│       └── ...                   # Existing components
│
├── components/tactical/          # NEW
│   ├── tactical-combat-view.component.tsx
│   ├── tactical-canvas.component.tsx
│   ├── turn-order-display.component.tsx
│   ├── action-menu.component.tsx
│   ├── tile-info-panel.component.tsx
│   └── doctrine-target-selector.component.tsx
│
├── lib/phaser/                   # NEW
│   ├── game-instance.ts
│   ├── config.ts
│   ├── scenes/
│   │   ├── boot-scene.ts
│   │   └── combat-scene.ts
│   ├── entities/
│   │   ├── unit.ts
│   │   ├── tile.ts
│   │   └── cursor.ts
│   └── systems/
│       ├── grid-system.ts
│       ├── pathfinding.ts
│       └── range-calculator.ts
│
└── stores/
    └── tactical-combat.store.ts  # NEW

server/
├── services/
│   └── combat.service.ts         # EXTEND (dice logic + tactical methods)
└── routers/
    └── activity.router.ts        # ADD tactical endpoints

shared/
├── types/
│   └── tactical-combat.types.ts  # NEW
└── constants/
    ├── terrain.ts                # NEW
    └── aoe-patterns.ts           # NEW
```

---

## Implementation Phases

### [x] Phase 1: Foundation

**Goal:** Phaser 3 integrated with basic grid rendering

**Tasks:**

1. Install Phaser 3: `bun add phaser`
2. Create `GameInstance` singleton (SSR-safe)
3. Create `TacticalCanvas` with dynamic import
4. Implement isometric `GridSystem`
5. Create `CombatScene` with static grid
6. Set up Zustand store

**Deliverable:** Isometric grid renders in React, camera controls work

### [x] Phase 2: Units & Selection

**Goal:** Units on grid, selection working

**Tasks:**

1. Create `Unit` sprite class - `front/lib/phaser/entities/unit.ts`
2. Implement tile click detection - Enhanced in `CombatScene`
3. Wire up selection to Zustand - `selectTile` with path preview
4. Calculate movement range - Dijkstra's algorithm in `front/lib/phaser/systems/pathfinding.ts`
5. Create `TurnOrderDisplay` component - Already complete from Phase 1
6. Create `ActionMenu` component - Already complete from Phase 1

**Deliverable:** Units spawn, clicking selects, movement range highlights

### [x] Phase 3: Movement

**Goal:** Units can move on the grid

**Tasks:**

1. Implement A\* pathfinding
2. Add backend movement validation
3. Create tRPC endpoint: `activity.executeTacticalMove`
4. Implement walking animation
5. Add terrain types

**Deliverable:** Full movement system with path preview

### [x] Phase 4: Combat Integration

**Goal:** Existing dice combat works with positioning

**Tasks:**

1. Implement attack range calculation
2. Modify `resolveTurn` to validate range
3. Create attack animations
4. Integrate existing `DiceRoller`
5. Add damage number display

**Deliverable:** Ranged attacks work, dice rolling preserved

### [x] Phase 5: Doctrine AoE

**Goal:** Doctrines have spatial effects

**Tasks:**

1. Define AoE patterns - `shared/constants/aoe-patterns.ts`
2. Create `DoctrineTargetSelector` component
3. Implement AoE preview highlighting
4. Backend `calculateAoETargets()` and `executeTacticalDoctrine()`
5. Spell effect animations

**Deliverable:** AoE doctrines target multiple enemies, all doctrine effect types implemented

### [x] Phase 6: Enemy AI

**Goal:** Enemies take intelligent turns

**Tasks:**

1. Simple AI decision tree
2. Backend handles enemy turns
3. AI movement toward player
4. AI attack when in range

**Deliverable:** Autonomous enemy turns

### [ ] Phase 7: Polish

**Goal:** Visual quality, game feel, and performance

#### 7.1 Animation Enhancements

| Task                     | Description                                                                                    |
| ------------------------ | ---------------------------------------------------------------------------------------------- |
| Sprite animation system  | Replace placeholder circles with animated sprite sheets (idle, walk, attack, cast, hit, death) |
| Idle breathing animation | Subtle scale oscillation (1.0 → 1.02 → 1.0) on all units to make them feel alive               |
| Direction facing         | Units face their movement direction and attack targets; flip sprites horizontally for E/W      |
| Hit stagger              | Brief recoil animation (50ms pushback) when taking damage                                      |

#### 7.2 Visual Effects

| Task                        | Description                                                                       |
| --------------------------- | --------------------------------------------------------------------------------- |
| Screen shake                | Camera shake on heavy attacks (intensity based on damage), deaths, and AoE spells |
| Hit sparks/particles        | Particle burst on melee impacts, projectile trails for ranged attacks             |
| Critical hit effects        | Larger damage numbers, special flash effect, screen shake amplified               |
| Status effect overlays      | Visual indicators on units: poison drip, burn flames, ice crystals, shield glow   |
| Particle effects for spells | Fire embers, ice shards, lightning arcs, holy rays, dark tendrils                 |

**Screen Shake Implementation:**

```typescript
function shakeCamera(scene: Phaser.Scene, intensity: 'light' | 'medium' | 'heavy'): void {
  const config = {
    light: { intensity: 0.005, duration: 100 },
    medium: { intensity: 0.01, duration: 150 },
    heavy: { intensity: 0.02, duration: 200 }
  }
  const { intensity: i, duration } = config[intensity]
  scene.cameras.main.shake(duration, i)
}

// Usage
shakeCamera(this, damage >= 20 ? 'heavy' : damage >= 10 ? 'medium' : 'light')
```

#### 7.3 Movement & Targeting UX

| Task                   | Description                                                             |
| ---------------------- | ----------------------------------------------------------------------- |
| Movement ghost preview | Semi-transparent unit sprite at destination tile before confirming move |
| Camera follow          | Auto-pan to active unit at turn start; smooth follow during movement    |
| Path preview dots      | Small dots along movement path showing exact route                      |

**Movement Ghost Implementation:**

```typescript
interface MovementGhost {
  sprite: Phaser.GameObjects.Sprite
  show(position: GridPosition): void
  hide(): void
}

// In CombatScene
private movementGhost: MovementGhost

createMovementGhost(): void {
  this.movementGhost = {
    sprite: this.add.sprite(0, 0, 'unit_player')
      .setAlpha(0.4)
      .setVisible(false)
      .setDepth(DEPTH.UNITS - 1),
    show(pos) {
      const screen = gridToScreen(pos.x, pos.y)
      this.sprite.setPosition(screen.x, screen.y).setVisible(true)
    },
    hide() {
      this.sprite.setVisible(false)
    }
  }
}

// Show ghost when hovering valid move tile
onTileHover(pos: GridPosition): void {
  if (this.isValidMoveDestination(pos)) {
    this.movementGhost.show(pos)
  } else {
    this.movementGhost.hide()
  }
}
```

#### 7.4 Performance Optimization

| Task              | Description                                                                     |
| ----------------- | ------------------------------------------------------------------------------- |
| Object pooling    | Pool floating text, particles, and highlight sprites to reduce GC pressure      |
| Tile culling      | Only render tiles within camera viewport + 1 tile buffer                        |
| Animation queuing | Queue multiple animations to prevent race conditions and ensure smooth chaining |
| Loading skeleton  | Replace spinner with skeleton UI showing grid outline and unit silhouettes      |

**Object Pool Implementation:**

```typescript
class FloatingTextPool {
  private pool: Phaser.GameObjects.Text[] = []
  private active: Set<Phaser.GameObjects.Text> = new Set()

  constructor(
    private scene: Phaser.Scene,
    private poolSize: number = 20
  ) {
    for (let i = 0; i < poolSize; i++) {
      const text = scene.add
        .text(0, 0, '', {
          fontSize: '16px',
          fontFamily: 'monospace',
          stroke: '#000',
          strokeThickness: 3
        })
        .setVisible(false)
        .setDepth(DEPTH.UI)
      this.pool.push(text)
    }
  }

  spawn(x: number, y: number, value: string, color: string): Phaser.GameObjects.Text | null {
    const text = this.pool.find((t) => !this.active.has(t))
    if (!text) return null

    text.setText(value).setColor(color).setPosition(x, y).setVisible(true).setAlpha(1)

    this.active.add(text)

    this.scene.tweens.add({
      targets: text,
      y: y - 40,
      alpha: 0,
      duration: 1000,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        text.setVisible(false)
        this.active.delete(text)
      }
    })

    return text
  }

  clear(): void {
    this.active.forEach((t) => t.setVisible(false))
    this.active.clear()
  }
}
```

**Animation Queue Implementation:**

```typescript
class AnimationQueue {
  private queue: Array<() => Promise<void>> = []
  private isProcessing = false

  async enqueue(animation: () => Promise<void>): Promise<void> {
    return new Promise((resolve) => {
      this.queue.push(async () => {
        await animation()
        resolve()
      })
      this.processQueue()
    })
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return
    this.isProcessing = true

    while (this.queue.length > 0) {
      const animation = this.queue.shift()!
      await animation()
    }

    this.isProcessing = false
  }

  clear(): void {
    this.queue = []
  }
}

// Usage in CombatScene
private animationQueue = new AnimationQueue()

async playAttackSequence(attacker: Unit, target: Unit, damage: number): Promise<void> {
  await this.animationQueue.enqueue(async () => {
    await attacker.playAttackAnimation(target.position)
    await target.playDamageAnimation()
    this.showFloatingDamage(target.position, damage)
    this.shakeCamera('medium')
  })
}
```

**Tile Culling Implementation:**

```typescript
// In GridSystem
updateVisibleTiles(camera: Phaser.Cameras.Scene2D.Camera): void {
  const bounds = camera.worldView
  const buffer = TILE_WIDTH // 1 tile buffer

  for (let y = 0; y < this.height; y++) {
    for (let x = 0; x < this.width; x++) {
      const screen = gridToScreen(x, y)
      const tile = this.tiles[y][x]

      const visible =
        screen.x >= bounds.x - buffer &&
        screen.x <= bounds.x + bounds.width + buffer &&
        screen.y >= bounds.y - buffer &&
        screen.y <= bounds.y + bounds.height + buffer

      tile.setVisible(visible)
    }
  }
}

// Call in scene update loop
update(): void {
  this.gridSystem.updateVisibleTiles(this.cameras.main)
}
```

#### 7.5 Deliverables

- Units animate smoothly with direction awareness
- Combat feels impactful with screen shake, particles, and hit effects
- Critical hits are visually distinct and satisfying
- Status effects are immediately visible on affected units
- Movement preview eliminates misclick frustration
- Stable 60fps on mid-range devices
- No GC stutters during combat

#### 7.6 Implementation Order

Ordered by dependency chain and testability. Each item is independently verifiable before moving to the next.

| #   | Task                               | Files to Modify            | How to Test                             | Status |
| --- | ---------------------------------- | -------------------------- | --------------------------------------- | ------ |
| 1   | [x] Screen shake                   | `combat-scene.ts`          | Attack enemy, take damage, kill enemy   |        |
| 2   | [x] Idle breathing                 | `unit.ts`                  | Watch any unit idle for 2 seconds       |        |
| 3   | [ ] Critical hit effects           | `combat-scene.ts`, store   | Attack until crit (or add debug)        |        |
| 4   | [ ] Movement ghost preview         | `combat-scene.ts`          | Select Move, hover over valid tiles     |        |
| 5   | [ ] Camera follow on turn start    | `combat-scene.ts`          | End turn, watch camera pan to next unit |        |
| 6   | [ ] Direction facing               | `unit.ts`                  | Move unit, attack different directions  |        |
| 7   | [ ] Hit sparks (basic particles)   | `combat-scene.ts`          | Attack enemy, see particle burst        |        |
| 8   | [ ] Status effect overlays         | `unit.ts`, `boot-scene.ts` | Cast doctrine with status effect        |        |
| 9   | [ ] Object pooling (floating text) | `combat-scene.ts`          | Spam attacks, check DevTools memory     |        |
| 10  | [ ] Animation queue                | `combat-scene.ts`          | Rapid actions, no visual glitches       |        |
| 11  | [ ] Tile culling                   | `grid-system.ts`           | Zoom out fully, check FPS stable        |        |

**Workflow:**

1. Implement one feature
2. User tests in browser
3. Fix any bugs
4. Check off the item
5. Optional: commit
6. Move to next feature

---

## Phaser + Next.js Integration

### SSR-Safe Game Instance

```typescript
// front/lib/phaser/game-instance.ts
import type Phaser from 'phaser'

let gameInstance: Phaser.Game | null = null

export async function createGame(parent: HTMLElement): Promise<Phaser.Game> {
  if (typeof window === 'undefined') {
    throw new Error('Phaser can only run in browser')
  }

  // Dynamic import to avoid SSR issues
  const Phaser = await import('phaser')
  const { BootScene } = await import('./scenes/boot-scene')
  const { CombatScene } = await import('./scenes/combat-scene')

  if (gameInstance) {
    gameInstance.destroy(true)
  }

  gameInstance = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 1280,
    height: 720,
    pixelArt: true,
    scene: [BootScene, CombatScene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    }
  })

  return gameInstance
}

export function destroyGame(): void {
  if (gameInstance) {
    gameInstance.destroy(true)
    gameInstance = null
  }
}

export function getGame(): Phaser.Game | null {
  return gameInstance
}
```

### React Canvas Wrapper

```typescript
// front/components/tactical/tactical-canvas.component.tsx
'use client'

import { useEffect, useRef } from 'react'

interface TacticalCanvasProps {
  onReady?: (game: Phaser.Game) => void
  className?: string
}

export default function TacticalCanvas({ onReady, className }: TacticalCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let mounted = true

    async function initGame() {
      if (!containerRef.current) return

      const { createGame } = await import('@/lib/phaser/game-instance')
      const game = await createGame(containerRef.current)

      if (mounted && onReady) {
        onReady(game)
      }
    }

    initGame()

    return () => {
      mounted = false
      import('@/lib/phaser/game-instance').then(({ destroyGame }) => {
        destroyGame()
      })
    }
  }, [onReady])

  return <div ref={containerRef} className={className} />
}
```

### Zustand Store Integration

```typescript
// front/stores/tactical-combat.store.ts
import { create } from 'zustand'
import type { TacticalCombatState, TacticalAction, GridPosition } from '@shared/types/tactical-combat.types'

interface TacticalStore extends TacticalCombatState {
  // Actions
  initializeCombat: (data: InitData) => void
  selectTile: (position: GridPosition) => void
  selectAction: (action: TacticalAction) => void
  confirmAction: () => Promise<void>
  cancelAction: () => void
  nextTurn: () => void
}

export const useTacticalStore = create<TacticalStore>((set, get) => ({
  // Initial state
  gridWidth: 12,
  gridHeight: 8,
  tiles: [],
  playerUnits: [],
  enemyUnits: [],
  turnOrder: [],
  currentTurnIndex: 0,
  activeUnitId: null,
  turnNumber: 0,
  phase: 'select_action',
  selectedTile: null,
  highlightedTiles: [],
  pendingAction: null,

  // Actions implementation...
  initializeCombat: (data) => set({ ...data }),

  selectTile: (position) => {
    const { phase, playerUnits, enemyUnits } = get()
    // Handle tile selection based on current phase
    // ...
  },

  nextTurn: () => {
    const { turnOrder, currentTurnIndex } = get()
    const nextIndex = (currentTurnIndex + 1) % turnOrder.length
    set({
      currentTurnIndex: nextIndex,
      activeUnitId: turnOrder[nextIndex].id,
      phase: turnOrder[nextIndex].isPlayer ? 'select_action' : 'enemy_turn'
    })
  }

  // Phaser subscribes via: useTacticalStore.subscribe(callback)
}))
```

---

## Combat Scene Structure

```typescript
// front/lib/phaser/scenes/combat-scene.ts
import Phaser from 'phaser'
import { GridSystem } from '../systems/grid-system'
import { Unit } from '../entities/unit'
import { useTacticalStore } from '@/stores/tactical-combat.store'

export class CombatScene extends Phaser.Scene {
  private gridSystem!: GridSystem
  private units: Map<string, Unit> = new Map()
  private unsubscribe?: () => void

  constructor() {
    super({ key: 'CombatScene' })
  }

  create(): void {
    // Initialize grid
    this.gridSystem = new GridSystem(this, 12, 8)
    this.gridSystem.render()

    // Subscribe directly to Zustand store (no wrapper needed)
    this.unsubscribe = useTacticalStore.subscribe((state) => {
      this.syncWithState(state)
    })

    // Initial sync
    this.syncWithState(useTacticalStore.getState())

    // Input handlers
    this.input.on('pointerdown', this.handleClick, this)
    this.input.on('pointermove', this.handleHover, this)

    // Camera controls
    this.setupCamera()
  }

  private syncWithState(state: TacticalStore): void {
    // Update highlights
    this.gridSystem.clearHighlights()
    for (const highlight of state.highlightedTiles) {
      this.gridSystem.setTileHighlight(highlight.position, highlight.type)
    }

    // Update unit positions
    for (const unitData of [...state.playerUnits, ...state.enemyUnits]) {
      let unit = this.units.get(unitData.id)
      if (!unit) {
        unit = this.spawnUnit(unitData)
      }
      unit.updateFromState(unitData)
    }
  }

  private handleClick(pointer: Phaser.Input.Pointer): void {
    const gridPos = this.gridSystem.screenToGrid(pointer.worldX, pointer.worldY)
    if (gridPos) {
      useTacticalStore.getState().selectTile(gridPos)
    }
  }

  // ... more methods
}
```

---

## Asset Requirements

### Tile Sprites (64x32 isometric)

| Asset  | Filename          | Description         |
| ------ | ----------------- | ------------------- |
| Grass  | `tile_grass.png`  | Default terrain     |
| Stone  | `tile_stone.png`  | Castle floors       |
| Water  | `tile_water.png`  | Animated (4 frames) |
| Lava   | `tile_lava.png`   | Animated, glowing   |
| Rubble | `tile_rubble.png` | Destroyed terrain   |

### Unit Sprites (32x48, 4 directions)

Each unit needs sprite sheet with 4 directions (N, S, E, W). Use horizontal flip for E/W symmetry to reduce art requirements.

**Animation States:**

- Idle: 4 frames
- Walk: 6 frames (per direction)
- Attack: 6 frames
- Cast: 6 frames
- Hit: 3 frames
- Death: 6 frames

**Required Units:**

- Player classes: Templar, Herald, Inquisitor, Demon Hunter
- Enemies: All from `enemies.ts` (skeleton, bandit, demon, etc.)

**Sprite Sheet Layout (per unit):**

```
Directions: 4 (N, S, E - flip E for W)
States: 6
Max frames per state: 6
Total frames: ~100 per character (vs ~200 with 8 directions)
```

### UI Elements

- Selection cursor (animated)
- Tile highlights (blue=move, red=attack, purple=doctrine)
- Damage numbers (pixel font)
- Turn order portraits

### Effects

- Attack slash/impact
- Spell particles (fire, ice, lightning, holy)
- Status effect icons

---

## Backend Endpoints

### New tRPC Procedures

All tactical methods are added to the existing `CombatService` class.

```typescript
// In activity.router.ts

// Initialize tactical combat
initializeTacticalCombat: protectedProcedure
  .input(
    z.object({
      activityId: z.string(),
      mapTemplateId: z.string().default('arena_small')
    })
  )
  .mutation(async ({ ctx, input }) => {
    return ctx.services.combat.initializeTactical(input.activityId, ctx.character.id, input.mapTemplateId)
  })

// Execute movement
executeTacticalMove: protectedProcedure
  .input(
    z.object({
      participationId: z.string(),
      unitId: z.string(),
      path: z.array(z.object({ x: z.number(), y: z.number() }))
    })
  )
  .mutation(async ({ ctx, input }) => {
    return ctx.services.combat.executeTacticalMove(input.participationId, input.unitId, input.path)
  })

// Resolve tactical attack (extends existing resolveTurn)
resolveTacticalAttack: protectedProcedure
  .input(
    z.object({
      participationId: z.string(),
      attackerId: z.string(),
      targetId: z.string(),
      attackRolls: z.array(z.number()),
      defenseRolls: z.array(z.number())
    })
  )
  .mutation(async ({ ctx, input }) => {
    // Validate range (no LoS check for v1)
    const validation = await ctx.services.combat.validateTacticalAttack(
      input.participationId,
      input.attackerId,
      input.targetId
    )

    if (!validation.valid) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: validation.reason })
    }

    // Reuse existing dice resolution
    return ctx.services.combat.resolveTurn({
      ...input
    })
  })

// Use doctrine with AoE targeting
useTacticalDoctrine: protectedProcedure
  .input(
    z.object({
      participationId: z.string(),
      doctrineId: z.string(),
      targetPosition: z.object({ x: z.number(), y: z.number() })
    })
  )
  .mutation(async ({ ctx, input }) => {
    return ctx.services.combat.useTacticalDoctrine(input.participationId, input.doctrineId, input.targetPosition)
  })
```

### CombatService Extensions

```typescript
// In combat.service.ts - add these methods to existing class

class CombatService {
  // ... existing methods ...

  // NEW: Tactical combat methods
  async initializeTactical(
    activityId: string,
    characterId: string,
    mapTemplateId: string
  ): Promise<TacticalCombatState> {
    const template = MAP_TEMPLATES[mapTemplateId]
    // Create tactical state, position units, initialize turn order
  }

  async executeTacticalMove(
    participationId: string,
    unitId: string,
    path: GridPosition[]
  ): Promise<{ success: boolean; newPosition: GridPosition }> {
    // Validate path, update position in tacticalState JSON
  }

  async validateTacticalAttack(
    participationId: string,
    attackerId: string,
    targetId: string
  ): Promise<{ valid: boolean; reason?: string }> {
    // Check range using Manhattan distance
  }

  async useTacticalDoctrine(
    participationId: string,
    doctrineId: string,
    targetPosition: GridPosition
  ): Promise<DoctrineResult> {
    // Get AoE pattern, find affected units, apply effects
  }
}
```

---

## Design Decisions

### 1. Map Templates (Hardcoded)

For v1, maps are predefined templates rather than procedurally generated. This ensures balanced encounters and faster implementation.

```typescript
interface MapTemplate {
  id: string
  name: string
  width: number
  height: number
  tiles: TerrainType[][] // 2D array of terrain
  playerSpawn: GridPosition
  enemySpawns: GridPosition[] // Supports up to 3 enemies
}

// Example templates
const MAP_TEMPLATES: Record<string, MapTemplate> = {
  arena_small: {
    id: 'arena_small',
    name: 'Small Arena',
    width: 8,
    height: 6,
    tiles: [
      ['stone', 'stone', 'stone', 'stone', 'stone', 'stone', 'stone', 'stone'],
      ['stone', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'stone'],
      ['stone', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'stone'],
      ['stone', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'stone'],
      ['stone', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'stone'],
      ['stone', 'stone', 'stone', 'stone', 'stone', 'stone', 'stone', 'stone']
    ],
    playerSpawn: { x: 1, y: 3 },
    enemySpawns: [
      { x: 6, y: 2 },
      { x: 6, y: 3 },
      { x: 6, y: 4 }
    ]
  },

  dungeon_corridor: {
    id: 'dungeon_corridor',
    name: 'Dungeon Corridor',
    width: 12,
    height: 6,
    tiles: [
      /* narrow corridor with obstacles */
    ],
    playerSpawn: { x: 1, y: 3 },
    enemySpawns: [
      { x: 10, y: 2 },
      { x: 10, y: 4 }
    ]
  },

  boss_chamber: {
    id: 'boss_chamber',
    name: 'Boss Chamber',
    width: 10,
    height: 10,
    tiles: [
      /* open room with hazards */
    ],
    playerSpawn: { x: 1, y: 5 },
    enemySpawns: [{ x: 8, y: 5 }] // Single boss
  }
}

// Map selection based on activity
function selectMap(activityType: string, difficulty: string): MapTemplate {
  const mappings: Record<string, string> = {
    siege_EASY: 'arena_small',
    siege_NORMAL: 'dungeon_corridor',
    siege_HARD: 'boss_chamber',
    dungeon_EASY: 'arena_small'
    // ... etc
  }
  return MAP_TEMPLATES[mappings[`${activityType}_${difficulty}`] ?? 'arena_small']
}
```

> **Future:** Procedural generation can be added later once core combat is stable.

### 2. Environmental Hazards

| Terrain | Movement | Effect                      |
| ------- | -------- | --------------------------- |
| Lava    | Cost 2   | 1 damage at end of turn     |
| Water   | Cost 2   | -1 movement next turn (wet) |
| Void    | Blocked  | Instant death if pushed in  |
| Rubble  | Cost 2   | None                        |

**Implementation:**

```typescript
function applyTerrainEffects(unit: TacticalUnit, tile: TileState): void {
  switch (tile.terrain) {
    case 'lava':
      unit.currentHealth -= 1
      addCombatLog({ type: 'TERRAIN_DAMAGE', data: { terrain: 'lava', damage: 1 } })
      break
    case 'water':
      unit.activeEffects.push({ type: 'WET', duration: 1, effect: 'movement -1' })
      break
  }
}
```

### 3. Future Considerations

Deferred features for later phases:

- **Elevation system:** Height-based damage bonuses and movement costs
- **Line of Sight:** Bresenham's algorithm for ranged attack validation
- **Procedural maps:** Generate maps based on activity type and difficulty
- **Retreat:** Not implemented initially. Player must win or die.
- **Performance:** Grid size capped at 16x12 for mobile compatibility.
- **Larger battles:** Architecture supports 6+ units, but UI needs adaptation.
- **In-combat inventory:** Future Phaser overlay for using items mid-battle without breaking immersion. Standard inventory/shop/investments pages remain React-only (management screens with no real-time rendering needs).

---

## References

- [Phaser 3 Documentation](https://photonstorm.github.io/phaser3-docs/)
- [Phaser 3 Examples](https://phaser.io/examples)
- [Final Fantasy Tactics Mechanics](https://finalfantasy.fandom.com/wiki/Final_Fantasy_Tactics_battle_system)
- [A\* Pathfinding Algorithm](https://www.redblobgames.com/pathfinding/a-star/introduction.html)
- [Isometric Coordinates](https://www.redblobgames.com/grids/hexagons/) (similar concepts)
