'use client'

import { create } from 'zustand'
import type {
  TacticalCombatState,
  TacticalAction,
  GridPosition,
  TacticalUnit,
  TileState,
  HighlightedTile,
  TacticalPhase,
  TacticalInitData,
  TerrainType
} from '@shared/types/tactical-combat.types'

interface TacticalCombatStore extends TacticalCombatState {
  // UI state (not in base TacticalCombatState)
  hoveredTile: GridPosition | null
  isInitialized: boolean

  // Actions
  initializeCombat: (data: TacticalInitData) => void
  selectTile: (position: GridPosition) => void
  setHoveredTile: (position: GridPosition | null) => void
  selectAction: (action: TacticalAction) => void
  confirmAction: () => Promise<void>
  cancelAction: () => void
  nextTurn: () => void
  setPhase: (phase: TacticalPhase) => void
  setHighlightedTiles: (tiles: HighlightedTile[]) => void
  updateUnit: (unitId: string, updates: Partial<TacticalUnit>) => void
  reset: () => void
}

// Default grid for testing (8x6 arena)
function createDefaultGrid(): TileState[][] {
  const width = 8
  const height = 6
  const tiles: TileState[][] = []

  for (let y = 0; y < height; y++) {
    tiles[y] = []
    for (let x = 0; x < width; x++) {
      // Create border of stone tiles
      let terrain: TerrainType = 'GRASS'
      if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
        terrain = 'STONE'
      }

      tiles[y][x] = {
        position: { x, y },
        terrain,
        occupantId: null,
        isWalkable: true // All default terrain types are walkable
      }
    }
  }

  return tiles
}

// Create default units for testing
function createDefaultUnits(): {
  playerUnits: TacticalUnit[]
  enemyUnits: TacticalUnit[]
} {
  const playerUnit: TacticalUnit = {
    id: 'player-1',
    templateId: 'player',
    name: 'Hero',
    position: { x: 1, y: 3 },
    isPlayer: true,
    currentHealth: 100,
    maxHealth: 100,
    currentMana: 50,
    maxMana: 50,
    movementRange: 3,
    attackRange: 1,
    speed: 2,
    hasMoved: false,
    hasActed: false,
    activeEffects: []
  }

  const enemyUnit1: TacticalUnit = {
    id: 'enemy-1',
    templateId: 'skeleton',
    name: 'Skeleton Warrior',
    position: { x: 6, y: 2 },
    isPlayer: false,
    currentHealth: 30,
    maxHealth: 30,
    currentMana: 0,
    maxMana: 0,
    movementRange: 2,
    attackRange: 1,
    speed: 1,
    hasMoved: false,
    hasActed: false,
    activeEffects: []
  }

  const enemyUnit2: TacticalUnit = {
    id: 'enemy-2',
    templateId: 'skeleton',
    name: 'Skeleton Archer',
    position: { x: 6, y: 4 },
    isPlayer: false,
    currentHealth: 20,
    maxHealth: 20,
    currentMana: 0,
    maxMana: 0,
    movementRange: 2,
    attackRange: 3,
    speed: 1,
    hasMoved: false,
    hasActed: false,
    activeEffects: []
  }

  return {
    playerUnits: [playerUnit],
    enemyUnits: [enemyUnit1, enemyUnit2]
  }
}

// Initialize turn order based on speed
function initializeTurnOrder(units: TacticalUnit[]): TacticalUnit[] {
  return [...units].sort((a, b) => {
    // Primary: speed (descending)
    const speedDiff = b.speed - a.speed
    if (speedDiff !== 0) return speedDiff
    // Tiebreaker: player units go first
    return a.isPlayer ? -1 : 1
  })
}

const initialState = (() => {
  const tiles = createDefaultGrid()
  const { playerUnits, enemyUnits } = createDefaultUnits()
  const allUnits = [...playerUnits, ...enemyUnits]
  const turnQueue = initializeTurnOrder(allUnits)

  // Set initial occupants on tiles
  for (const unit of allUnits) {
    const { x, y } = unit.position
    if (tiles[y] && tiles[y][x]) {
      tiles[y][x].occupantId = unit.id
    }
  }

  return {
    gridWidth: 8,
    gridHeight: 6,
    tiles,
    playerUnits,
    enemyUnits,
    turnQueue,
    currentTurnIndex: 0,
    activeUnitId: turnQueue[0]?.id ?? null,
    turnNumber: 1,
    phase: 'select_action' as TacticalPhase,
    selectedTile: null,
    highlightedTiles: [],
    pendingAction: null,
    hoveredTile: null,
    isInitialized: true
  }
})()

export const useTacticalCombatStore = create<TacticalCombatStore>((set, get) => ({
  ...initialState,

  initializeCombat: (data: TacticalInitData) => {
    const allUnits = [...data.playerUnits, ...data.enemyUnits]
    const turnQueue = initializeTurnOrder(allUnits)

    set({
      gridWidth: data.gridWidth,
      gridHeight: data.gridHeight,
      tiles: data.tiles,
      playerUnits: data.playerUnits,
      enemyUnits: data.enemyUnits,
      turnQueue,
      currentTurnIndex: 0,
      activeUnitId: turnQueue[0]?.id ?? null,
      turnNumber: 1,
      phase: 'select_action',
      selectedTile: null,
      highlightedTiles: [],
      pendingAction: null,
      isInitialized: true
    })
  },

  selectTile: (position: GridPosition) => {
    const { phase, playerUnits, enemyUnits, tiles } = get()

    // Get the tile and its occupant
    const tile = tiles[position.y]?.[position.x]
    if (!tile) return

    // Find occupant unit if any
    const allUnits = [...playerUnits, ...enemyUnits]
    const occupant = allUnits.find((u) => u.id === tile.occupantId)

    // Handle based on current phase
    switch (phase) {
      case 'select_action':
        // Select the tile
        set({ selectedTile: position })

        // If clicking on active unit, could show action menu (handled by React)
        // If clicking on enemy, could highlight as potential target
        break

      case 'select_move':
        // Validate movement destination
        // For now, just select the tile - validation will be in Phase 3
        set({
          selectedTile: position,
          pendingAction: {
            type: 'move',
            path: [position]
          }
        })
        break

      case 'select_target':
        // Select attack/doctrine target
        if (occupant && !occupant.isPlayer) {
          const currentAction = get().pendingAction
          set({
            selectedTile: position,
            pendingAction: {
              type: currentAction?.type ?? 'attack',
              ...currentAction,
              targetPosition: position,
              targetUnitIds: [occupant.id]
            }
          })
        }
        break

      default:
        // During animating or enemy turn, ignore clicks
        break
    }
  },

  setHoveredTile: (position: GridPosition | null) => {
    set({ hoveredTile: position })
  },

  selectAction: (action: TacticalAction) => {
    const { activeUnitId, playerUnits } = get()

    // Find the active unit
    const activeUnit = playerUnits.find((u) => u.id === activeUnitId)
    if (!activeUnit) return

    switch (action.type) {
      case 'move':
        // Calculate and highlight movement range (simplified for Phase 1)
        const movementTiles = calculateMovementRange(
          activeUnit.position,
          activeUnit.movementRange,
          get().gridWidth,
          get().gridHeight
        )
        set({
          phase: 'select_move',
          pendingAction: action,
          highlightedTiles: movementTiles.map((pos) => ({
            position: pos,
            type: 'MOVEMENT'
          }))
        })
        break

      case 'attack':
        // Highlight attack range
        const attackTiles = calculateAttackRange(
          activeUnit.position,
          activeUnit.attackRange,
          get().gridWidth,
          get().gridHeight
        )
        set({
          phase: 'select_target',
          pendingAction: action,
          highlightedTiles: attackTiles.map((pos) => ({
            position: pos,
            type: 'ATTACK'
          }))
        })
        break

      case 'wait':
        // End turn immediately
        set({ pendingAction: action })
        get().nextTurn()
        break

      default:
        set({ pendingAction: action })
    }
  },

  confirmAction: async () => {
    const { pendingAction, activeUnitId, playerUnits } = get()
    if (!pendingAction || !activeUnitId) return

    // For Phase 1, just mark the action as done and advance turn
    // Real backend integration will happen in Phase 3+

    const updatedPlayerUnits = playerUnits.map((unit) => {
      if (unit.id === activeUnitId) {
        return {
          ...unit,
          hasMoved: pendingAction.type === 'move' ? true : unit.hasMoved,
          hasActed: pendingAction.type === 'attack' ? true : unit.hasActed
        }
      }
      return unit
    })

    set({
      playerUnits: updatedPlayerUnits,
      pendingAction: null,
      highlightedTiles: [],
      phase: 'select_action'
    })
  },

  cancelAction: () => {
    set({
      pendingAction: null,
      highlightedTiles: [],
      phase: 'select_action',
      selectedTile: null
    })
  },

  nextTurn: () => {
    const { turnQueue, currentTurnIndex, turnNumber } = get()
    const nextIndex = (currentTurnIndex + 1) % turnQueue.length
    const nextUnit = turnQueue[nextIndex]

    // Check if we've completed a full round
    const newTurnNumber = nextIndex === 0 ? turnNumber + 1 : turnNumber

    // Reset turn state for next unit
    const resetUnit = (unit: TacticalUnit): TacticalUnit => ({
      ...unit,
      hasMoved: false,
      hasActed: false
    })

    set((state) => ({
      currentTurnIndex: nextIndex,
      activeUnitId: nextUnit?.id ?? null,
      turnNumber: newTurnNumber,
      phase: nextUnit?.isPlayer ? 'select_action' : 'enemy_turn',
      selectedTile: null,
      highlightedTiles: [],
      pendingAction: null,
      playerUnits: state.playerUnits.map(
        (u) => (u.id === nextUnit?.id ? resetUnit(u) : u)
      ),
      enemyUnits: state.enemyUnits.map(
        (u) => (u.id === nextUnit?.id ? resetUnit(u) : u)
      )
    }))
  },

  setPhase: (phase: TacticalPhase) => {
    set({ phase })
  },

  setHighlightedTiles: (tiles: HighlightedTile[]) => {
    set({ highlightedTiles: tiles })
  },

  updateUnit: (unitId: string, updates: Partial<TacticalUnit>) => {
    set((state) => ({
      playerUnits: state.playerUnits.map((unit) =>
        unit.id === unitId ? { ...unit, ...updates } : unit
      ),
      enemyUnits: state.enemyUnits.map((unit) =>
        unit.id === unitId ? { ...unit, ...updates } : unit
      )
    }))
  },

  reset: () => {
    const tiles = createDefaultGrid()
    const { playerUnits, enemyUnits } = createDefaultUnits()
    const allUnits = [...playerUnits, ...enemyUnits]
    const turnQueue = initializeTurnOrder(allUnits)

    // Set initial occupants on tiles
    for (const unit of allUnits) {
      const { x, y } = unit.position
      if (tiles[y] && tiles[y][x]) {
        tiles[y][x].occupantId = unit.id
      }
    }

    set({
      gridWidth: 8,
      gridHeight: 6,
      tiles,
      playerUnits,
      enemyUnits,
      turnQueue,
      currentTurnIndex: 0,
      activeUnitId: turnQueue[0]?.id ?? null,
      turnNumber: 1,
      phase: 'select_action',
      selectedTile: null,
      highlightedTiles: [],
      pendingAction: null,
      hoveredTile: null,
      isInitialized: true
    })
  }
}))

// Helper: Calculate movement range (simplified - no pathfinding yet)
function calculateMovementRange(
  center: GridPosition,
  range: number,
  gridWidth: number,
  gridHeight: number
): GridPosition[] {
  const tiles: GridPosition[] = []

  for (let dx = -range; dx <= range; dx++) {
    for (let dy = -range; dy <= range; dy++) {
      // Use Manhattan distance
      if (Math.abs(dx) + Math.abs(dy) <= range && (dx !== 0 || dy !== 0)) {
        const x = center.x + dx
        const y = center.y + dy
        if (x >= 0 && x < gridWidth && y >= 0 && y < gridHeight) {
          tiles.push({ x, y })
        }
      }
    }
  }

  return tiles
}

// Helper: Calculate attack range
function calculateAttackRange(
  center: GridPosition,
  range: number,
  gridWidth: number,
  gridHeight: number
): GridPosition[] {
  const tiles: GridPosition[] = []

  for (let dx = -range; dx <= range; dx++) {
    for (let dy = -range; dy <= range; dy++) {
      // Use Manhattan distance
      if (Math.abs(dx) + Math.abs(dy) <= range) {
        const x = center.x + dx
        const y = center.y + dy
        if (x >= 0 && x < gridWidth && y >= 0 && y < gridHeight) {
          tiles.push({ x, y })
        }
      }
    }
  }

  return tiles
}
