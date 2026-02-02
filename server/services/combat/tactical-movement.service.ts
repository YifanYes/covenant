import { TERRAIN_CONFIG } from '@shared/constants/terrain'
import type {
  GridPosition,
  TacticalStateData,
  MovementValidationResult,
  MovementExecutionResult
} from '@shared/types/tactical-combat.types'
import { TRPCError } from '@trpc/server'
import type { ActivityParticipationRepository } from '../../repositories/activity-participation.repository'

export class TacticalMovementService {
  constructor(private activityParticipationRepository: ActivityParticipationRepository) {}

  /**
   * Validate a tactical movement action.
   * Checks path validity, movement range, terrain costs, and occupancy.
   */
  validateTacticalMove(
    state: TacticalStateData,
    unitId: string,
    path: GridPosition[]
  ): MovementValidationResult {
    if (path.length < 2) {
      return { valid: false, reason: 'Path must have at least 2 positions' }
    }

    const unitState = state.units.find((u) => u.id === unitId)
    if (!unitState) {
      return { valid: false, reason: 'Unit not found' }
    }

    const currentUnitId = state.turnOrder[state.currentTurnIndex]
    if (currentUnitId !== unitId) {
      return { valid: false, reason: 'Not this unit\'s turn' }
    }

    if (unitState.hasMoved) {
      return { valid: false, reason: 'Unit has already moved this turn' }
    }

    const startPos = path[0]
    if (startPos.x !== unitState.position.x || startPos.y !== unitState.position.y) {
      return { valid: false, reason: 'Path must start at unit\'s current position' }
    }

    const occupiedPositions = new Set<string>()
    for (const unit of state.units) {
      if (unit.id !== unitId) {
        occupiedPositions.add(`${unit.position.x},${unit.position.y}`)
      }
    }

    let totalCost = 0

    for (let i = 1; i < path.length; i++) {
      const current = path[i - 1]
      const next = path[i]

      const dx = Math.abs(next.x - current.x)
      const dy = Math.abs(next.y - current.y)
      if ((dx + dy) !== 1) {
        return { valid: false, reason: 'Path contains non-adjacent tiles' }
      }

      if (next.x < 0 || next.x >= state.gridWidth || next.y < 0 || next.y >= state.gridHeight) {
        return { valid: false, reason: 'Path goes out of bounds' }
      }

      const tile = state.tiles[next.y]?.[next.x]
      if (!tile) {
        return { valid: false, reason: 'Invalid tile in path' }
      }

      if (!tile.isWalkable) {
        return { valid: false, reason: 'Path contains unwalkable tile' }
      }

      const posKey = `${next.x},${next.y}`
      if (occupiedPositions.has(posKey) && i < path.length - 1) {
        return { valid: false, reason: 'Path is blocked by another unit' }
      }

      if (i === path.length - 1 && occupiedPositions.has(posKey)) {
        return { valid: false, reason: 'Destination is occupied' }
      }

      const terrainConfig = TERRAIN_CONFIG[tile.terrain]
      const moveCost = terrainConfig?.movementCost ?? 1

      if (!Number.isFinite(moveCost)) {
        return { valid: false, reason: 'Path contains impassable terrain' }
      }

      totalCost += moveCost
    }

    return { valid: true, pathCost: totalCost }
  }

  /**
   * Execute a tactical movement action.
   * Updates the tactical state with the new unit position.
   */
  async executeTacticalMove(
    participationId: string,
    unitId: string,
    path: GridPosition[],
    movementRange: number
  ): Promise<MovementExecutionResult> {
    const participation = await this.activityParticipationRepository.findByIdWithTacticalState(participationId)

    if (!participation) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Participation not found' })
    }

    if (!participation.tacticalState || !participation.tacticalState.units || !Array.isArray(participation.tacticalState.units)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'No tactical combat in progress. Please rejoin the activity to initialize combat state.'
      })
    }

    const state = participation.tacticalState

    const validation = this.validateTacticalMove(state, unitId, path)

    if (!validation.valid) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: validation.reason || 'Invalid move' })
    }

    if (validation.pathCost && validation.pathCost > movementRange) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Move exceeds movement range' })
    }

    const destination = path[path.length - 1]

    const unitIndex = state.units.findIndex((u) => u.id === unitId)
    if (unitIndex === -1) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Unit not found in state' })
    }

    const oldPosition = state.units[unitIndex].position

    const updatedTiles = state.tiles.map((row) => row.map((tile) => ({ ...tile })))

    if (updatedTiles[oldPosition.y]?.[oldPosition.x]) {
      updatedTiles[oldPosition.y][oldPosition.x].occupantId = null
    }

    if (updatedTiles[destination.y]?.[destination.x]) {
      updatedTiles[destination.y][destination.x].occupantId = unitId
    }

    const updatedUnits = state.units.map((unit, i) => {
      if (i === unitIndex) {
        return {
          ...unit,
          position: destination,
          hasMoved: true
        }
      }
      return unit
    })

    const updatedState: TacticalStateData = {
      ...state,
      tiles: updatedTiles,
      units: updatedUnits
    }

    await this.activityParticipationRepository.updateTacticalState(participationId, updatedState)

    return {
      success: true,
      newPosition: destination,
      updatedState
    }
  }
}
