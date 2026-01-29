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
  getPathCost,
  calculateDoctrineRange,
  calculateAoEArea,
  findUnitsInAoE
} from '@/lib/phaser/systems/pathfinding'
import { getEnemy } from '@shared/constants/enemies'
import { DOCTRINES } from '@shared/constants/doctrines'
import { DoctrineEffectType, DoctrineTarget, StatusEffect, type ActiveStatusEffect } from '@shared/types/doctrine.types'

// Next enemy data returned from server when enemy is defeated
interface NextEnemyData {
  id: string
  templateId: string
  name: string
  currentHealth: number
  maxHealth: number
}

// Attack animation data
interface AttackAnimationData {
  attackerId: string
  targetId: string
  damageDealt: number
  targetKilled: boolean
  damageToAttacker: number
  attackerKilled: boolean
  // Data for the next enemy if one was spawned
  nextEnemy?: NextEnemyData
  goldReward?: number
}

// Pending enemy attack data (for after movement animation)
interface PendingEnemyAttack {
  attackerId: string
  targetId: string
  damageDealt: number
  targetKilled: boolean
}

// Doctrine animation data
interface DoctrineAnimationData {
  casterId: string
  doctrineId: string
  targetPosition: GridPosition
  affectedTiles: GridPosition[]
  affectedUnitIds: string[]
  effects: {
    unitId: string
    damageDealt?: number
    healthRestored?: number
    statusApplied?: string
    killed?: boolean
  }[]
}

interface TacticalCombatStore extends TacticalCombatState {
  // UI state (not in base TacticalCombatState)
  hoveredTile: GridPosition | null
  isInitialized: boolean
  animatingUnitId: string | null
  animationPath: GridPosition[] | null
  participationId: string | null

  // Attack state
  attackAnimationData: AttackAnimationData | null
  isAttackAnimating: boolean

  // Enemy turn state
  pendingEnemyAttack: PendingEnemyAttack | null

  // Doctrine state
  selectedDoctrineId: string | null
  doctrineAnimationData: DoctrineAnimationData | null
  isDoctrineAnimating: boolean

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

  // Attack actions
  startAttackAnimation: (data: AttackAnimationData) => void
  completeAttackAnimation: () => void

  // Enemy turn actions
  startEnemyMovement: (unitId: string, path: GridPosition[]) => void

  applyAttackResult: (
    targetId: string,
    damage: number,
    killed: boolean,
    attackerId?: string,
    attackerDamage?: number
  ) => void

  // Doctrine actions
  selectDoctrine: (doctrineId: string) => void
  clearDoctrineSelection: () => void
  startDoctrineAnimation: (data: DoctrineAnimationData) => void
  completeDoctrineAnimation: () => void

  // Self-buff doctrine actions
  applySelfBuffDoctrine: (unitId: string, doctrineId: string, bonusDice: number) => void
  getActiveUnitBonusDice: () => { bonusDice: number; sixesGenerateExtraHits: boolean }
  clearActiveUnitDoctrines: () => void
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
    participationId: null,
    attackAnimationData: null,
    isAttackAnimating: false,
    pendingEnemyAttack: null,
    selectedDoctrineId: null,
    doctrineAnimationData: null,
    isDoctrineAnimating: false
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
          mapTemplateId: persistedState.mapTemplateId,
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
        // Check if this is doctrine targeting mode
        const { selectedDoctrineId, pendingAction: currentPendingAction } = get()

        if (selectedDoctrineId && currentPendingAction?.type === 'doctrine') {
          // Doctrine targeting mode - calculate AoE and affected units
          const isInDoctrineRange = highlightedTiles.some(
            (h) => h.type === 'DOCTRINE' && h.position.x === position.x && h.position.y === position.y
          )

          if (isInDoctrineRange) {
            // Calculate AoE area for this doctrine
            const aoeArea = calculateAoEArea(
              position,
              activeUnit!.position,
              selectedDoctrineId,
              get().gridWidth,
              get().gridHeight
            )

            // Find affected units (enemies only for damage doctrines)
            const affectedUnitIds = findUnitsInAoE(
              aoeArea,
              allUnits,
              false, // Don't include allies for damage
              activeUnit!.isPlayer
            )

            // Update highlights to show AoE preview
            const doctrineRangeHighlights = highlightedTiles.filter(h => h.type === 'DOCTRINE')
            const aoeHighlights: HighlightedTile[] = aoeArea.map(pos => ({
              position: pos,
              type: 'SELECTED' as const
            }))

            set({
              selectedTile: position,
              highlightedTiles: [...doctrineRangeHighlights, ...aoeHighlights],
              pendingAction: {
                type: 'doctrine',
                doctrineId: selectedDoctrineId,
                targetPosition: position,
                targetUnitIds: affectedUnitIds
              }
            })
          } else {
            // Clicked outside doctrine range
            set({ selectedTile: position })
          }
        } else {
          // Regular attack targeting mode
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

      case 'doctrine':
        // Doctrine targeting mode - handled by selectDoctrine
        if (action.doctrineId) {
          get().selectDoctrine(action.doctrineId)
        }
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
    const { turnQueue, currentTurnIndex, turnNumber, playerUnits, enemyUnits } = get()

    // Handle empty turn queue
    if (turnQueue.length === 0) {
      console.warn('[nextTurn] Turn queue is empty')
      set({
        activeUnitId: null,
        phase: 'select_action',
        selectedTile: null,
        highlightedTiles: [],
        pendingAction: null
      })
      return
    }

    // Find next ALIVE unit in the queue, skipping dead units
    const allUnits = [...playerUnits, ...enemyUnits]
    let nextIndex = (currentTurnIndex + 1) % turnQueue.length
    let attempts = 0
    let nextUnit = turnQueue[nextIndex]

    // Safety check: skip any units that are dead (shouldn't happen but just in case)
    while (attempts < turnQueue.length) {
      nextUnit = turnQueue[nextIndex]
      const actualUnit = allUnits.find((u) => u.id === nextUnit?.id)
      if (actualUnit && actualUnit.currentHealth > 0) {
        break // Found a valid alive unit
      }
      // Unit is dead or not found, try next
      nextIndex = (nextIndex + 1) % turnQueue.length
      attempts++
    }

    // If we couldn't find any alive unit, something is wrong
    if (attempts >= turnQueue.length || !nextUnit) {
      console.warn('[nextTurn] No alive units found in turn queue')
      set({
        activeUnitId: null,
        phase: 'select_action',
        selectedTile: null,
        highlightedTiles: [],
        pendingAction: null
      })
      return
    }

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

    // Check if there's a pending enemy attack to execute after movement
    const pendingAttack = get().pendingEnemyAttack

    if (pendingAttack) {
      // Clear the movement animation state and start attack animation
      set({
        tiles: updatedTiles,
        playerUnits: updatedPlayerUnits,
        enemyUnits: updatedEnemyUnits,
        pendingAction: null,
        animatingUnitId: null,
        animationPath: null,
        pendingEnemyAttack: null,
        phase: 'animating',
        isAttackAnimating: true,
        attackAnimationData: {
          attackerId: pendingAttack.attackerId,
          targetId: pendingAttack.targetId,
          damageDealt: pendingAttack.damageDealt,
          targetKilled: pendingAttack.targetKilled,
          damageToAttacker: 0,
          attackerKilled: false
        },
        highlightedTiles: []
      })
      return
    }

    // Check if it was an enemy that finished moving
    const wasEnemyMoving = !activeUnit?.isPlayer

    // If it was an enemy that finished moving and they didn't attack, advance turn
    if (wasEnemyMoving) {
      set({
        tiles: updatedTiles,
        playerUnits: updatedPlayerUnits,
        enemyUnits: updatedEnemyUnits,
        pendingAction: null,
        animatingUnitId: null,
        animationPath: null
      })
      // Advance to next turn
      get().nextTurn()
      return
    }

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

  // Enemy turn actions
  startEnemyMovement: (unitId: string, path: GridPosition[]) => {
    set({
      phase: 'animating',
      animatingUnitId: unitId,
      animationPath: path,
      highlightedTiles: []
    })
  },

  // Attack actions
  startAttackAnimation: (data: AttackAnimationData) => {
    set({
      phase: 'animating',
      isAttackAnimating: true,
      attackAnimationData: data,
      highlightedTiles: []
    })
  },

  completeAttackAnimation: () => {
    const { attackAnimationData, playerUnits, enemyUnits, tiles, turnQueue, currentTurnIndex, gridWidth, gridHeight, activeUnitId } = get()

    if (!attackAnimationData) {
      set({
        isAttackAnimating: false,
        attackAnimationData: null,
        phase: 'select_action'
      })
      return
    }

    const { targetId, damageDealt, targetKilled, attackerId, damageToAttacker, attackerKilled, nextEnemy } = attackAnimationData

    // Apply damage to target
    let updatedPlayerUnits = playerUnits.map((unit) => {
      if (unit.id === targetId) {
        return {
          ...unit,
          currentHealth: Math.max(0, unit.currentHealth - damageDealt)
        }
      }
      if (unit.id === attackerId) {
        return {
          ...unit,
          hasActed: true,
          currentHealth: Math.max(0, unit.currentHealth - damageToAttacker)
        }
      }
      return unit
    })

    let updatedEnemyUnits = enemyUnits.map((unit) => {
      if (unit.id === targetId) {
        return {
          ...unit,
          currentHealth: Math.max(0, unit.currentHealth - damageDealt)
        }
      }
      if (unit.id === attackerId) {
        return {
          ...unit,
          hasActed: true,
          currentHealth: Math.max(0, unit.currentHealth - damageToAttacker)
        }
      }
      return unit
    })

    // Update tiles to remove dead units
    let updatedTiles = tiles.map((row) => row.map((tile) => ({ ...tile })))

    if (targetKilled) {
      const targetUnit = [...playerUnits, ...enemyUnits].find((u) => u.id === targetId)
      if (targetUnit) {
        const { x, y } = targetUnit.position
        if (updatedTiles[y]?.[x]) {
          updatedTiles[y][x].occupantId = null
        }
      }
      // Remove dead unit
      updatedPlayerUnits = updatedPlayerUnits.filter((u) => u.id !== targetId)
      updatedEnemyUnits = updatedEnemyUnits.filter((u) => u.id !== targetId)
    }

    if (attackerKilled) {
      const attackerUnit = [...playerUnits, ...enemyUnits].find((u) => u.id === attackerId)
      if (attackerUnit) {
        const { x, y } = attackerUnit.position
        if (updatedTiles[y]?.[x]) {
          updatedTiles[y][x].occupantId = null
        }
      }
      // Remove dead unit
      updatedPlayerUnits = updatedPlayerUnits.filter((u) => u.id !== attackerId)
      updatedEnemyUnits = updatedEnemyUnits.filter((u) => u.id !== attackerId)
    }

    // Check if it was an enemy that attacked
    const wasEnemyAttack = attackerId && !attackerId.startsWith('player-')

    // If a next enemy was spawned (enemy defeated by player), reinitialize combat
    if (nextEnemy && targetKilled && !wasEnemyAttack) {
      const playerUnit = updatedPlayerUnits[0]
      if (playerUnit) {
        // Reset player position
        const playerPosition = { x: 1, y: 3 }
        const enemyPosition = { x: 6, y: 3 }

        // Create fresh grid
        const freshTiles: TileState[][] = []
        for (let y = 0; y < gridHeight; y++) {
          freshTiles[y] = []
          for (let x = 0; x < gridWidth; x++) {
            let terrain: TerrainType = 'GRASS'
            if (x === 0 || x === gridWidth - 1 || y === 0 || y === gridHeight - 1) {
              terrain = 'STONE'
            }
            freshTiles[y][x] = {
              position: { x, y },
              terrain,
              occupantId: null,
              isWalkable: true
            }
          }
        }

        // Set occupants
        freshTiles[playerPosition.y][playerPosition.x].occupantId = playerUnit.id
        freshTiles[enemyPosition.y][enemyPosition.x].occupantId = nextEnemy.id

        // Reset player
        const resetPlayer: TacticalUnit = {
          ...playerUnit,
          position: playerPosition,
          hasMoved: false,
          hasActed: false
        }

        // Create new enemy unit with sprite from template
        const enemyTemplate = getEnemy(nextEnemy.templateId)
        const newEnemyUnit: TacticalUnit = {
          id: nextEnemy.id,
          templateId: nextEnemy.templateId,
          name: nextEnemy.name,
          position: enemyPosition,
          isPlayer: false,
          spriteUrl: enemyTemplate?.imageId ? `/assets/enemies/${enemyTemplate.imageId}.png` : undefined,
          currentHealth: nextEnemy.currentHealth,
          maxHealth: nextEnemy.maxHealth,
          currentMana: 0,
          maxMana: 0,
          movementRange: 2,
          attackRange: enemyTemplate?.attackDice ?? 1,
          speed: 1,
          hasMoved: false,
          hasActed: false,
          activeEffects: []
        }

        const newTurnQueue = [resetPlayer, newEnemyUnit]

        set({
          tiles: freshTiles,
          playerUnits: [resetPlayer],
          enemyUnits: [newEnemyUnit],
          turnQueue: newTurnQueue,
          currentTurnIndex: 0,
          activeUnitId: resetPlayer.id,
          turnNumber: 1,
          isAttackAnimating: false,
          attackAnimationData: null,
          pendingAction: null,
          phase: 'select_action',
          selectedTile: null,
          highlightedTiles: []
        })
        return
      }
    }

    // Standard flow: update turn queue to remove dead units
    const allAliveUnits = [...updatedPlayerUnits, ...updatedEnemyUnits]
    const aliveUnitIds = new Set(allAliveUnits.map((u) => u.id))
    const updatedTurnQueue = turnQueue.filter((u) => aliveUnitIds.has(u.id))

    // Adjust current turn index if needed - ensure it points to a valid unit
    let newCurrentTurnIndex = currentTurnIndex
    if (newCurrentTurnIndex >= updatedTurnQueue.length) {
      newCurrentTurnIndex = 0
    }

    // Determine the active unit ID - the attacker should still be active after their attack
    // unless they're dead or it was an enemy attack
    let newActiveUnitId = activeUnitId
    if (attackerKilled) {
      // Attacker died, need to determine new active unit
      const nextUnit = updatedTurnQueue[newCurrentTurnIndex]
      newActiveUnitId = nextUnit?.id ?? null
    } else if (!wasEnemyAttack) {
      // Player attacked - they should remain active
      newActiveUnitId = attackerId
    }

    // Determine phase based on remaining units
    let newPhase: TacticalPhase = 'select_action'
    if (updatedEnemyUnits.length === 0) {
      // All enemies defeated - activity should be ending
      // Keep in select_action but no enemies to target
      newPhase = 'select_action'
    } else if (wasEnemyAttack) {
      // Enemy attacked - will advance turn after this
      newPhase = 'select_action'
    }

    set({
      playerUnits: updatedPlayerUnits,
      enemyUnits: updatedEnemyUnits,
      tiles: updatedTiles,
      turnQueue: updatedTurnQueue,
      currentTurnIndex: newCurrentTurnIndex,
      activeUnitId: newActiveUnitId,
      isAttackAnimating: false,
      attackAnimationData: null,
      pendingAction: null,
      phase: newPhase,
      selectedTile: null,
      highlightedTiles: []
    })

    // If it was an enemy attack, advance to next turn
    if (wasEnemyAttack) {
      get().nextTurn()
    }
  },

  applyAttackResult: (
    targetId: string,
    damage: number,
    killed: boolean,
    attackerId?: string,
    attackerDamage?: number
  ) => {
    const { playerUnits, enemyUnits, tiles } = get()

    let updatedPlayerUnits = playerUnits.map((unit) => {
      if (unit.id === targetId) {
        return { ...unit, currentHealth: Math.max(0, unit.currentHealth - damage) }
      }
      if (attackerId && unit.id === attackerId && attackerDamage) {
        return { ...unit, hasActed: true, currentHealth: Math.max(0, unit.currentHealth - attackerDamage) }
      }
      if (attackerId && unit.id === attackerId) {
        return { ...unit, hasActed: true }
      }
      return unit
    })

    let updatedEnemyUnits = enemyUnits.map((unit) => {
      if (unit.id === targetId) {
        return { ...unit, currentHealth: Math.max(0, unit.currentHealth - damage) }
      }
      if (attackerId && unit.id === attackerId && attackerDamage) {
        return { ...unit, hasActed: true, currentHealth: Math.max(0, unit.currentHealth - attackerDamage) }
      }
      if (attackerId && unit.id === attackerId) {
        return { ...unit, hasActed: true }
      }
      return unit
    })

    // Update tiles for dead units
    const updatedTiles = tiles.map((row) => row.map((tile) => ({ ...tile })))
    if (killed) {
      const targetUnit = [...playerUnits, ...enemyUnits].find((u) => u.id === targetId)
      if (targetUnit) {
        const { x, y } = targetUnit.position
        if (updatedTiles[y]?.[x]) {
          updatedTiles[y][x].occupantId = null
        }
      }
      updatedPlayerUnits = updatedPlayerUnits.filter((u) => u.id !== targetId)
      updatedEnemyUnits = updatedEnemyUnits.filter((u) => u.id !== targetId)
    }

    set({
      playerUnits: updatedPlayerUnits,
      enemyUnits: updatedEnemyUnits,
      tiles: updatedTiles
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
      participationId: null,
      attackAnimationData: null,
      isAttackAnimating: false,
      pendingEnemyAttack: null,
      selectedDoctrineId: null,
      doctrineAnimationData: null,
      isDoctrineAnimating: false
    })
  },

  // Doctrine actions
  selectDoctrine: (doctrineId: string) => {
    const { activeUnitId, playerUnits, gridWidth, gridHeight } = get()

    // Find the active unit
    const activeUnit = playerUnits.find((u) => u.id === activeUnitId)
    if (!activeUnit) return

    // Calculate doctrine range
    const doctrineTiles = calculateDoctrineRange(
      activeUnit.position,
      doctrineId,
      gridWidth,
      gridHeight
    )

    set({
      phase: 'select_target',
      selectedDoctrineId: doctrineId,
      pendingAction: {
        type: 'doctrine',
        doctrineId
      },
      highlightedTiles: doctrineTiles.map((pos) => ({
        position: pos,
        type: 'DOCTRINE' as const
      }))
    })
  },

  clearDoctrineSelection: () => {
    set({
      selectedDoctrineId: null,
      phase: 'select_action',
      pendingAction: null,
      highlightedTiles: []
    })
  },

  startDoctrineAnimation: (data: DoctrineAnimationData) => {
    set({
      phase: 'animating',
      isDoctrineAnimating: true,
      doctrineAnimationData: data,
      highlightedTiles: []
    })
  },

  completeDoctrineAnimation: () => {
    const { doctrineAnimationData, playerUnits, enemyUnits, tiles, turnQueue, currentTurnIndex } = get()

    if (!doctrineAnimationData) {
      set({
        isDoctrineAnimating: false,
        doctrineAnimationData: null,
        selectedDoctrineId: null,
        phase: 'select_action'
      })
      return
    }

    const { effects, casterId } = doctrineAnimationData

    // Apply effects to units
    let updatedPlayerUnits = [...playerUnits]
    let updatedEnemyUnits = [...enemyUnits]
    const updatedTiles = tiles.map((row) => row.map((tile) => ({ ...tile })))

    for (const effect of effects) {
      const { unitId, damageDealt, healthRestored, killed, statusApplied } = effect

      // Update player units
      updatedPlayerUnits = updatedPlayerUnits.map((unit) => {
        if (unit.id === unitId) {
          let newHealth = unit.currentHealth
          if (damageDealt) newHealth = Math.max(0, newHealth - damageDealt)
          if (healthRestored) newHealth = Math.min(unit.maxHealth, newHealth + healthRestored)

          // Apply status effect if present
          let newActiveEffects = [...unit.activeEffects]
          if (statusApplied) {
            const newStatusEffect: ActiveStatusEffect = {
              effect: statusApplied as StatusEffect,
              remainingTurns: 1,
              sourceDoctrineId: doctrineAnimationData.doctrineId
            }
            newActiveEffects = [...newActiveEffects, newStatusEffect]
          }

          return { ...unit, currentHealth: newHealth, activeEffects: newActiveEffects }
        }
        if (unit.id === casterId) {
          return { ...unit, hasActed: true }
        }
        return unit
      })

      // Update enemy units
      updatedEnemyUnits = updatedEnemyUnits.map((unit) => {
        if (unit.id === unitId) {
          let newHealth = unit.currentHealth
          if (damageDealt) newHealth = Math.max(0, newHealth - damageDealt)
          if (healthRestored) newHealth = Math.min(unit.maxHealth, newHealth + healthRestored)

          // Apply status effect if present
          let newActiveEffects = [...unit.activeEffects]
          if (statusApplied) {
            const newStatusEffect: ActiveStatusEffect = {
              effect: statusApplied as StatusEffect,
              remainingTurns: 1,
              sourceDoctrineId: doctrineAnimationData.doctrineId
            }
            newActiveEffects = [...newActiveEffects, newStatusEffect]
          }

          return { ...unit, currentHealth: newHealth, activeEffects: newActiveEffects }
        }
        return unit
      })

      // Handle killed units
      if (killed) {
        const killedUnit = [...playerUnits, ...enemyUnits].find((u) => u.id === unitId)
        if (killedUnit) {
          const { x, y } = killedUnit.position
          if (updatedTiles[y]?.[x]) {
            updatedTiles[y][x].occupantId = null
          }
        }
        updatedPlayerUnits = updatedPlayerUnits.filter((u) => u.id !== unitId)
        updatedEnemyUnits = updatedEnemyUnits.filter((u) => u.id !== unitId)
      }
    }

    // Update turn queue to remove dead units
    const allAliveUnits = [...updatedPlayerUnits, ...updatedEnemyUnits]
    const aliveUnitIds = new Set(allAliveUnits.map((u) => u.id))
    const updatedTurnQueue = turnQueue.filter((u) => aliveUnitIds.has(u.id))

    // Adjust current turn index if needed
    let newCurrentTurnIndex = currentTurnIndex
    if (newCurrentTurnIndex >= updatedTurnQueue.length) {
      newCurrentTurnIndex = 0
    }

    set({
      playerUnits: updatedPlayerUnits,
      enemyUnits: updatedEnemyUnits,
      tiles: updatedTiles,
      turnQueue: updatedTurnQueue,
      currentTurnIndex: newCurrentTurnIndex,
      isDoctrineAnimating: false,
      doctrineAnimationData: null,
      selectedDoctrineId: null,
      pendingAction: null,
      phase: 'select_action'
    })
  },

  // Self-buff doctrine actions
  applySelfBuffDoctrine: (unitId: string, doctrineId: string, bonusDice: number) => {
    const { playerUnits, enemyUnits } = get()

    // Create the active doctrine effect
    const activeEffect: ActiveStatusEffect = {
      effect: StatusEffect.DOCTRINE_ACTIVE,
      remainingTurns: 1,
      sourceDoctrineId: doctrineId
    }

    // Update the unit's active effects
    const updatedPlayerUnits = playerUnits.map((unit) => {
      if (unit.id === unitId) {
        return {
          ...unit,
          activeEffects: [...unit.activeEffects, activeEffect]
        }
      }
      return unit
    })

    set({ playerUnits: updatedPlayerUnits })
  },

  getActiveUnitBonusDice: () => {
    const { activeUnitId, playerUnits } = get()

    if (!activeUnitId) {
      return { bonusDice: 0, sixesGenerateExtraHits: false }
    }

    const activeUnit = playerUnits.find((u) => u.id === activeUnitId)
    if (!activeUnit) {
      return { bonusDice: 0, sixesGenerateExtraHits: false }
    }

    let bonusDice = 0
    let sixesGenerateExtraHits = false

    for (const effect of activeUnit.activeEffects) {
      if (effect.remainingTurns <= 0) continue

      const doctrine = DOCTRINES[effect.sourceDoctrineId]
      if (!doctrine) continue

      for (const doctrineEffect of doctrine.effects) {
        if (doctrineEffect.type === DoctrineEffectType.POWER_MODIFIER &&
            doctrineEffect.target === DoctrineTarget.SELF) {
          bonusDice += doctrineEffect.value || 0

          // Stellar Collapse has the special rule that 6s generate extra hits
          if (effect.sourceDoctrineId === 'stellar_collapse') {
            sixesGenerateExtraHits = true
          }
        }
      }
    }

    return { bonusDice, sixesGenerateExtraHits }
  },

  clearActiveUnitDoctrines: () => {
    const { activeUnitId, playerUnits } = get()

    if (!activeUnitId) return

    const updatedPlayerUnits = playerUnits.map((unit) => {
      if (unit.id === activeUnitId) {
        // Filter out consumed self-buff doctrines
        const remainingEffects = unit.activeEffects.filter((effect) => {
          const doctrine = DOCTRINES[effect.sourceDoctrineId]
          if (!doctrine) return false

          // Check if this is a self-buff POWER_MODIFIER - these get consumed on attack
          const isSelfBuff = doctrine.effects.some(
            (e) => e.type === DoctrineEffectType.POWER_MODIFIER && e.target === DoctrineTarget.SELF
          ) && !doctrine.aoePattern

          // Keep non-self-buff effects
          return !isSelfBuff
        })

        return {
          ...unit,
          activeEffects: remainingEffects
        }
      }
      return unit
    })

    set({ playerUnits: updatedPlayerUnits })
  }
}))

