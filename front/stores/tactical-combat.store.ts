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
  TacticalStateData,
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
  animatingUnitId: string | null
  animationPath: GridPosition[] | null
  participationId: string | null

  // Actions
  initializeCombat: (data: TacticalInitData, participationId?: string) => void
  hydrateFromState: (
    persistedState: TacticalStateData,
    unitTemplates: TacticalUnit[],
    participationId: string
  ) => void
  setParticipationId: (id: string | null) => void
  selectTile: (position: GridPosition) => void
  setHoveredTile: (position: GridPosition | null) => void
  selectAction: (action: TacticalAction) => void
  confirmAction: () => Promise<void>
  cancelAction: () => void
  nextTurn: () => void
  setPhase: (phase: TacticalPhase) => void
  setHighlightedTiles: (tiles: HighlightedTile[]) => void
  updateUnit: (unitId: string, updates: Partial<TacticalUnit>) => void
  completeAnimation: () => void
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
    isInitialized: true,
    animatingUnitId: null,
    animationPath: null,
    participationId: null
  }
})()

export const useTacticalCombatStore = create<TacticalCombatStore>((set, get) => ({
  ...initialState,

  initializeCombat: (data: TacticalInitData, participationId?: string) => {
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
      isInitialized: true,
      participationId: participationId ?? null
    })
  },

  hydrateFromState: (
    persistedState: TacticalStateData,
    unitTemplates: TacticalUnit[],
    participationId: string
  ) => {
    // Merge persisted unit state with full unit templates
    // Filter out units that don't have a matching template (graceful degradation)
    const hydratedUnits: TacticalUnit[] = []
    for (const persistedUnit of persistedState.units) {
      const template = unitTemplates.find((t) => t.id === persistedUnit.id)
      if (!template) {
        console.warn(`Unit template not found for id: ${persistedUnit.id}, skipping unit`)
        continue
      }
      hydratedUnits.push({
        ...template,
        position: persistedUnit.position,
        hasMoved: persistedUnit.hasMoved,
        hasActed: persistedUnit.hasActed
      })
    }

    // If no units could be hydrated, fall back to fresh state
    if (hydratedUnits.length === 0) {
      console.error('No units could be hydrated from persisted state, falling back to fresh combat')
      get().initializeCombat(
        {
          gridWidth: persistedState.gridWidth,
          gridHeight: persistedState.gridHeight,
          tiles: persistedState.tiles,
          playerUnits: unitTemplates.filter((u) => u.isPlayer),
          enemyUnits: unitTemplates.filter((u) => !u.isPlayer),
          turnQueue: unitTemplates
        },
        participationId
      )
      return
    }

    const playerUnits = hydratedUnits.filter((u) => u.isPlayer)
    const enemyUnits = hydratedUnits.filter((u) => !u.isPlayer)

    // Reconstruct turn queue from persisted turn order
    const turnQueue = persistedState.turnOrder
      .map((id) => hydratedUnits.find((u) => u.id === id))
      .filter((u): u is TacticalUnit => u !== undefined)

    // Determine active unit
    const activeUnitId = turnQueue[persistedState.currentTurnIndex]?.id ?? null
    const activeUnit = hydratedUnits.find((u) => u.id === activeUnitId)

    // Determine phase based on active unit
    const phase: TacticalPhase = activeUnit?.isPlayer ? 'select_action' : 'enemy_turn'

    set({
      gridWidth: persistedState.gridWidth,
      gridHeight: persistedState.gridHeight,
      tiles: persistedState.tiles,
      playerUnits,
      enemyUnits,
      turnQueue,
      currentTurnIndex: persistedState.currentTurnIndex,
      activeUnitId,
      turnNumber: persistedState.turnNumber,
      phase,
      selectedTile: null,
      highlightedTiles: [],
      pendingAction: null,
      isInitialized: true,
      participationId
    })
  },

  setParticipationId: (id: string | null) => {
    set({ participationId: id })
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
    const { pendingAction, activeUnitId, playerUnits, enemyUnits } = get()
    if (!pendingAction || !activeUnitId) return

    // Find the active unit
    const activeUnit = [...playerUnits, ...enemyUnits].find((u) => u.id === activeUnitId)
    if (!activeUnit) return

    // Handle move action - trigger animation
    if (pendingAction.type === 'move' && pendingAction.path && pendingAction.path.length > 1) {
      // Set animation state - the scene will pick this up and animate
      set({
        phase: 'animating',
        animatingUnitId: activeUnitId,
        animationPath: pendingAction.path,
        highlightedTiles: []
      })
      // Don't update position yet - completeAnimation will do that
      return
    }

    // For non-movement actions, update immediately
    const updatedPlayerUnits = playerUnits.map((unit) => {
      if (unit.id === activeUnitId) {
        return {
          ...unit,
          hasActed: pendingAction.type === 'attack' ? true : unit.hasActed
        }
      }
      return unit
    })

    const updatedEnemyUnits = enemyUnits.map((unit) => {
      if (unit.id === activeUnitId) {
        return {
          ...unit,
          hasActed: pendingAction.type === 'attack' ? true : unit.hasActed
        }
      }
      return unit
    })

    set({
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

  completeAnimation: () => {
    const { animatingUnitId, animationPath, playerUnits, enemyUnits, tiles } = get()
    if (!animatingUnitId || !animationPath || animationPath.length < 2) {
      // No animation to complete
      set({
        animatingUnitId: null,
        animationPath: null,
        phase: 'select_action',
        pendingAction: null
      })
      return
    }

    const destination = animationPath[animationPath.length - 1]

    // Find the unit that was animating
    const activeUnit = [...playerUnits, ...enemyUnits].find((u) => u.id === animatingUnitId)
    if (!activeUnit) {
      set({
        animatingUnitId: null,
        animationPath: null,
        phase: 'select_action',
        pendingAction: null
      })
      return
    }

    // Clone tiles for mutation
    const updatedTiles = tiles.map((row) => row.map((tile) => ({ ...tile })))

    // Clear old tile occupant
    const oldTile = updatedTiles[activeUnit.position.y]?.[activeUnit.position.x]
    if (oldTile) {
      oldTile.occupantId = null
    }

    // Set new tile occupant
    const newTile = updatedTiles[destination.y]?.[destination.x]
    if (newTile) {
      newTile.occupantId = animatingUnitId
    }

    // Update units
    const updatedPlayerUnits = playerUnits.map((unit) => {
      if (unit.id === animatingUnitId) {
        return {
          ...unit,
          position: destination,
          hasMoved: true
        }
      }
      return unit
    })

    const updatedEnemyUnits = enemyUnits.map((unit) => {
      if (unit.id === animatingUnitId) {
        return {
          ...unit,
          position: destination,
          hasMoved: true
        }
      }
      return unit
    })

    set({
      tiles: updatedTiles,
      playerUnits: updatedPlayerUnits,
      enemyUnits: updatedEnemyUnits,
      pendingAction: null,
      animatingUnitId: null,
      animationPath: null,
      phase: 'select_action'
    })
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
      isInitialized: true,
      animatingUnitId: null,
      animationPath: null,
      participationId: null
    })
  }
}))

