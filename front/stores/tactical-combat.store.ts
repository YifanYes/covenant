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
import {
  calculateMovementRange as calcMoveRange,
  calculateAttackRange as calcAttackRange,
  calculatePath,
  getPathCost
} from '@/lib/phaser/systems/pathfinding'

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
    const { phase, playerUnits, enemyUnits, tiles, activeUnitId, highlightedTiles } = get()

    // Get the tile and its occupant
    const tile = tiles[position.y]?.[position.x]
    if (!tile) return

    // Find occupant unit if any
    const allUnits = [...playerUnits, ...enemyUnits]
    const occupant = allUnits.find((u) => u.id === tile.occupantId)

    // Find active unit
    const activeUnit = allUnits.find((u) => u.id === activeUnitId)

    // Handle based on current phase
    switch (phase) {
      case 'select_action':
        // Select the tile for info display
        set({ selectedTile: position })
        break

      case 'select_move':
        // Check if clicked tile is in movement range
        const isInMoveRange = highlightedTiles.some(
          (h) => h.type === 'MOVEMENT' && h.position.x === position.x && h.position.y === position.y
        )

        if (isInMoveRange && activeUnit) {
          // Calculate path to destination
          const path = calculatePath(
            activeUnit.position,
            position,
            tiles,
            allUnits,
            activeUnit.isPlayer
          )

          if (path.length > 0) {
            // Validate path cost is within movement range
            const pathCost = getPathCost(path, tiles)
            if (pathCost <= activeUnit.movementRange) {
              // Update highlights to show the path
              const movementHighlights = highlightedTiles.filter((h) => h.type === 'MOVEMENT')
              const pathHighlights: HighlightedTile[] = path.slice(1).map((pos) => ({
                position: pos,
                type: 'PATH' as const
              }))

              set({
                selectedTile: position,
                pendingAction: {
                  type: 'move',
                  path: path
                },
                highlightedTiles: [...movementHighlights, ...pathHighlights]
              })
            }
          }
        } else if (!isInMoveRange) {
          // Clicked outside movement range - could cancel or just ignore
          // For now, just update selected tile for info display
          set({ selectedTile: position })
        }
        break

      case 'select_target':
        // Check if clicked tile has a valid target
        if (occupant && !occupant.isPlayer) {
          // Check if target is in attack range
          const isInAttackRange = highlightedTiles.some(
            (h) => h.type === 'ATTACK' && h.position.x === position.x && h.position.y === position.y
          )

          if (isInAttackRange) {
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
        } else {
          // Clicked on non-enemy tile - update selected for info
          set({ selectedTile: position })
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
    const { activeUnitId, playerUnits, enemyUnits, tiles, gridWidth, gridHeight } = get()

    // Find the active unit
    const activeUnit = playerUnits.find((u) => u.id === activeUnitId)
    if (!activeUnit) return

    const allUnits = [...playerUnits, ...enemyUnits]

    switch (action.type) {
      case 'move':
        // Calculate movement range using Dijkstra's algorithm with terrain costs
        const movementTiles = calcMoveRange(
          activeUnit.position,
          activeUnit.movementRange,
          tiles,
          allUnits,
          activeUnit.isPlayer
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
        // Calculate attack range (simple Manhattan distance, no terrain blocking)
        const attackTiles = calcAttackRange(
          activeUnit.position,
          activeUnit.attackRange,
          gridWidth,
          gridHeight
        )
        // Filter to only highlight tiles with enemies
        const tilesWithEnemies = attackTiles.filter((pos) => {
          const enemy = enemyUnits.find(
            (u) => u.position.x === pos.x && u.position.y === pos.y
          )
          return enemy !== undefined
        })
        set({
          phase: 'select_target',
          pendingAction: action,
          highlightedTiles: [
            // Show full attack range in lighter color
            ...attackTiles.map((pos) => ({
              position: pos,
              type: 'ATTACK' as const
            })),
            // Highlight targetable enemies distinctly
            ...tilesWithEnemies.map((pos) => ({
              position: pos,
              type: 'SELECTED' as const
            }))
          ]
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
    const { pendingAction, activeUnitId, playerUnits, enemyUnits, tiles } = get()
    if (!pendingAction || !activeUnitId) return

    // Find the active unit
    const activeUnit = [...playerUnits, ...enemyUnits].find((u) => u.id === activeUnitId)
    if (!activeUnit) return

    // Clone tiles for mutation
    const updatedTiles = tiles.map((row) => row.map((tile) => ({ ...tile })))

    let newPosition = activeUnit.position

    // Handle move action - update position
    if (pendingAction.type === 'move' && pendingAction.path && pendingAction.path.length > 0) {
      const destination = pendingAction.path[pendingAction.path.length - 1]

      // Clear old tile occupant
      const oldTile = updatedTiles[activeUnit.position.y]?.[activeUnit.position.x]
      if (oldTile) {
        oldTile.occupantId = null
      }

      // Set new tile occupant
      const newTile = updatedTiles[destination.y]?.[destination.x]
      if (newTile) {
        newTile.occupantId = activeUnitId
      }

      newPosition = destination
    }

    // Update units
    const updatedPlayerUnits = playerUnits.map((unit) => {
      if (unit.id === activeUnitId) {
        return {
          ...unit,
          position: newPosition,
          hasMoved: pendingAction.type === 'move' ? true : unit.hasMoved,
          hasActed: pendingAction.type === 'attack' ? true : unit.hasActed
        }
      }
      return unit
    })

    const updatedEnemyUnits = enemyUnits.map((unit) => {
      if (unit.id === activeUnitId) {
        return {
          ...unit,
          position: newPosition,
          hasMoved: pendingAction.type === 'move' ? true : unit.hasMoved,
          hasActed: pendingAction.type === 'attack' ? true : unit.hasActed
        }
      }
      return unit
    })

    set({
      tiles: updatedTiles,
      playerUnits: updatedPlayerUnits,
      enemyUnits: updatedEnemyUnits,
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

