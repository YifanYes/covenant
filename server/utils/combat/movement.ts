import { TERRAIN_CONFIG } from '@shared/constants/terrain'
import type {
  GridPosition,
  TacticalStateData,
  TileState,
  MovementValidationResult,
  MovementExecutionResult,
  TacticalUnitState
} from '@shared/types/tactical-combat.types'
import { TRPCError } from '@trpc/server'
import type { ActivityParticipationRepository } from '../../repositories/activity-participation.repository'

/**
 * Calculate Manhattan distance between two positions.
 */
export function getManhattanDistance(from: GridPosition, to: GridPosition): number {
  return Math.abs(from.x - to.x) + Math.abs(from.y - to.y)
}

/**
 * Find the closest player unit to an enemy.
 */
export function findClosestPlayer(
  enemyPos: GridPosition,
  units: TacticalUnitState[]
): TacticalUnitState | null {
  const playerUnits = units.filter((u) => u.id.startsWith('player-') && u.currentHealth > 0)
  if (playerUnits.length === 0) return null

  let closest: TacticalUnitState | null = null
  let minDistance = Infinity

  for (const player of playerUnits) {
    const distance = getManhattanDistance(enemyPos, player.position)
    if (distance < minDistance) {
      minDistance = distance
      closest = player
    }
  }

  return closest
}

/**
 * Validate a tactical movement action.
 * Checks path validity, movement range, terrain costs, and occupancy.
 */
export function validateTacticalMove(
  state: TacticalStateData,
  unitId: string,
  path: GridPosition[]
): MovementValidationResult {
  // Validate path has at least 2 positions
  if (path.length < 2) {
    return { valid: false, reason: 'Path must have at least 2 positions' }
  }

  // Find the unit
  const unitState = state.units.find((u) => u.id === unitId)
  if (!unitState) {
    return { valid: false, reason: 'Unit not found' }
  }

  // Check if it's the unit's turn
  const currentUnitId = state.turnOrder[state.currentTurnIndex]
  if (currentUnitId !== unitId) {
    return { valid: false, reason: 'Not this unit\'s turn' }
  }

  // Check if unit has already moved
  if (unitState.hasMoved) {
    return { valid: false, reason: 'Unit has already moved this turn' }
  }

  // Verify path starts at unit's current position
  const startPos = path[0]
  if (startPos.x !== unitState.position.x || startPos.y !== unitState.position.y) {
    return { valid: false, reason: 'Path must start at unit\'s current position' }
  }

  // Build occupancy map (excluding the moving unit)
  const occupiedPositions = new Set<string>()
  for (const unit of state.units) {
    if (unit.id !== unitId) {
      occupiedPositions.add(`${unit.position.x},${unit.position.y}`)
    }
  }

  // Calculate path cost and validate each step
  let totalCost = 0

  for (let i = 1; i < path.length; i++) {
    const current = path[i - 1]
    const next = path[i]

    // Validate adjacent movement (cardinal directions only)
    const dx = Math.abs(next.x - current.x)
    const dy = Math.abs(next.y - current.y)
    if ((dx + dy) !== 1) {
      return { valid: false, reason: 'Path contains non-adjacent tiles' }
    }

    // Validate bounds
    if (next.x < 0 || next.x >= state.gridWidth || next.y < 0 || next.y >= state.gridHeight) {
      return { valid: false, reason: 'Path goes out of bounds' }
    }

    // Get tile
    const tile = state.tiles[next.y]?.[next.x]
    if (!tile) {
      return { valid: false, reason: 'Invalid tile in path' }
    }

    // Check if tile is walkable
    if (!tile.isWalkable) {
      return { valid: false, reason: 'Path contains unwalkable tile' }
    }

    // Check occupancy (except for destination which could be the target)
    const posKey = `${next.x},${next.y}`
    if (occupiedPositions.has(posKey) && i < path.length - 1) {
      return { valid: false, reason: 'Path is blocked by another unit' }
    }

    // Final destination must not be occupied
    if (i === path.length - 1 && occupiedPositions.has(posKey)) {
      return { valid: false, reason: 'Destination is occupied' }
    }

    // Calculate terrain movement cost
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
 * Calculate movement range tiles using Dijkstra's algorithm.
 * Returns a map of position keys to their costs.
 */
export function calculateMovementRange(
  start: GridPosition,
  movementPoints: number,
  tiles: TileState[][],
  units: TacticalUnitState[],
  isPlayer: boolean
): Map<string, { position: GridPosition; cost: number }> {
  const gridHeight = tiles.length
  const gridWidth = tiles[0]?.length ?? 0
  const reachable = new Map<string, { position: GridPosition; cost: number }>()

  if (gridWidth === 0 || gridHeight === 0) return reachable

  // Build occupancy map (opposite side blocks movement)
  const blocked = new Set<string>()
  for (const unit of units) {
    if ((unit.id.startsWith('player-')) !== isPlayer) {
      blocked.add(`${unit.position.x},${unit.position.y}`)
    }
  }

  // Also block friendly units (can't move through allies)
  for (const unit of units) {
    if ((unit.id.startsWith('player-')) === isPlayer) {
      blocked.add(`${unit.position.x},${unit.position.y}`)
    }
  }

  const distances = new Map<string, number>()
  const queue: { position: GridPosition; cost: number }[] = []

  distances.set(`${start.x},${start.y}`, 0)
  queue.push({ position: start, cost: 0 })

  const directions = [
    { dx: 0, dy: -1 },
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 }
  ]

  while (queue.length > 0) {
    queue.sort((a, b) => a.cost - b.cost)
    const current = queue.shift()!
    const currentKey = `${current.position.x},${current.position.y}`

    if (distances.has(currentKey) && distances.get(currentKey)! < current.cost) {
      continue
    }

    for (const dir of directions) {
      const nextX = current.position.x + dir.dx
      const nextY = current.position.y + dir.dy
      const nextPos: GridPosition = { x: nextX, y: nextY }
      const nextKey = `${nextX},${nextY}`

      // Check bounds
      if (nextX < 0 || nextX >= gridWidth || nextY < 0 || nextY >= gridHeight) {
        continue
      }

      // Get tile
      const tile = tiles[nextY]?.[nextX]
      if (!tile || !tile.isWalkable) continue

      // Check if blocked
      if (blocked.has(nextKey) && !(nextX === start.x && nextY === start.y)) {
        continue
      }

      // Calculate cost
      const terrainConfig = TERRAIN_CONFIG[tile.terrain]
      const moveCost = terrainConfig?.movementCost ?? 1

      if (!Number.isFinite(moveCost)) continue

      const totalCost = current.cost + moveCost

      if (totalCost > movementPoints) continue

      if (!distances.has(nextKey) || distances.get(nextKey)! > totalCost) {
        distances.set(nextKey, totalCost)
        queue.push({ position: nextPos, cost: totalCost })

        if (nextX !== start.x || nextY !== start.y) {
          reachable.set(nextKey, { position: nextPos, cost: totalCost })
        }
      }
    }
  }

  return reachable
}

/**
 * Calculate A* path between two positions.
 */
export function calculateAIPath(
  start: GridPosition,
  end: GridPosition,
  tiles: TileState[][],
  units: TacticalUnitState[],
  movingUnitId: string
): GridPosition[] {
  const gridHeight = tiles.length
  const gridWidth = tiles[0]?.length ?? 0

  if (gridWidth === 0 || gridHeight === 0) return []

  // Build occupancy map (all units block except the moving unit)
  const blocked = new Set<string>()
  for (const unit of units) {
    if (unit.id !== movingUnitId) {
      blocked.add(`${unit.position.x},${unit.position.y}`)
    }
  }

  const posKey = (pos: GridPosition) => `${pos.x},${pos.y}`
  const heuristic = (pos: GridPosition) =>
    Math.abs(pos.x - end.x) + Math.abs(pos.y - end.y)

  const openSet: { pos: GridPosition; fScore: number }[] = []
  const cameFrom = new Map<string, GridPosition>()
  const gScore = new Map<string, number>()

  gScore.set(posKey(start), 0)
  openSet.push({ pos: start, fScore: heuristic(start) })

  const directions = [
    { dx: 0, dy: -1 },
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 }
  ]

  while (openSet.length > 0) {
    openSet.sort((a, b) => a.fScore - b.fScore)
    const current = openSet.shift()!

    if (current.pos.x === end.x && current.pos.y === end.y) {
      const path: GridPosition[] = []
      let curr: GridPosition | undefined = end
      while (curr) {
        path.unshift(curr)
        curr = cameFrom.get(posKey(curr))
      }
      return path
    }

    const currentKey = posKey(current.pos)
    const currentGScore = gScore.get(currentKey) ?? Infinity

    for (const dir of directions) {
      const nextX = current.pos.x + dir.dx
      const nextY = current.pos.y + dir.dy
      const nextPos: GridPosition = { x: nextX, y: nextY }
      const nextKey = posKey(nextPos)

      if (nextX < 0 || nextX >= gridWidth || nextY < 0 || nextY >= gridHeight) {
        continue
      }

      const tile = tiles[nextY]?.[nextX]
      if (!tile || !tile.isWalkable) continue

      // Allow moving to destination even if blocked (for attack targeting)
      if (blocked.has(nextKey) && !(nextX === end.x && nextY === end.y)) {
        continue
      }

      const terrainConfig = TERRAIN_CONFIG[tile.terrain]
      const moveCost = terrainConfig?.movementCost ?? 1

      if (!Number.isFinite(moveCost)) continue

      const tentativeGScore = currentGScore + moveCost

      if (tentativeGScore < (gScore.get(nextKey) ?? Infinity)) {
        cameFrom.set(nextKey, current.pos)
        gScore.set(nextKey, tentativeGScore)
        const fScore = tentativeGScore + heuristic(nextPos)

        const inOpenSet = openSet.some((item) => item.pos.x === nextX && item.pos.y === nextY)
        if (!inOpenSet) {
          openSet.push({ pos: nextPos, fScore })
        }
      }
    }
  }

  return []
}

/**
 * Find the best tile to move to that gets closer to target.
 * Returns the position and path to get there.
 */
export function findBestMoveTowardTarget(
  enemy: TacticalUnitState,
  target: TacticalUnitState,
  movementRange: Map<string, { position: GridPosition; cost: number }>,
  tiles: TileState[][],
  units: TacticalUnitState[],
  enemyAttackRange: number
): { position: GridPosition; path: GridPosition[] } | null {
  if (movementRange.size === 0) return null

  // Build set of occupied positions (except enemy's current position)
  const occupied = new Set<string>()
  for (const unit of units) {
    if (unit.id !== enemy.id) {
      occupied.add(`${unit.position.x},${unit.position.y}`)
    }
  }

  // Find the reachable tile that minimizes distance to target
  let bestTile: GridPosition | null = null
  let bestDistance = getManhattanDistance(enemy.position, target.position)
  let bestIsInAttackRange = false

  for (const [key, data] of movementRange) {
    // Skip occupied tiles
    if (occupied.has(key)) continue

    const distance = getManhattanDistance(data.position, target.position)
    const isInAttackRange = distance <= enemyAttackRange

    // Prefer tiles that put us in attack range, then minimize distance
    if (isInAttackRange && !bestIsInAttackRange) {
      bestTile = data.position
      bestDistance = distance
      bestIsInAttackRange = true
    } else if (isInAttackRange === bestIsInAttackRange && distance < bestDistance) {
      bestTile = data.position
      bestDistance = distance
    }
  }

  if (!bestTile) return null

  // Calculate path to best tile
  const path = calculateAIPath(enemy.position, bestTile, tiles, units, enemy.id)
  if (path.length < 2) return null

  return { position: bestTile, path }
}

/**
 * Execute a tactical movement action.
 * Updates the tactical state with the new unit position.
 */
export async function executeTacticalMove(
  participationId: string,
  unitId: string,
  path: GridPosition[],
  movementRange: number,
  activityParticipationRepository: ActivityParticipationRepository
): Promise<MovementExecutionResult> {
  // Get current tactical state
  const participation = await activityParticipationRepository.findByIdWithTacticalState(participationId)

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

  // Validate the move
  const validation = validateTacticalMove(state, unitId, path)

  if (!validation.valid) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: validation.reason || 'Invalid move' })
  }

  // Check movement range
  if (validation.pathCost && validation.pathCost > movementRange) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Move exceeds movement range' })
  }

  // Get destination
  const destination = path[path.length - 1]

  // Update unit position in state
  const unitIndex = state.units.findIndex((u) => u.id === unitId)
  if (unitIndex === -1) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Unit not found in state' })
  }

  const oldPosition = state.units[unitIndex].position

  // Update tiles occupancy
  const updatedTiles = state.tiles.map((row) => row.map((tile) => ({ ...tile })))

  // Clear old tile
  if (updatedTiles[oldPosition.y]?.[oldPosition.x]) {
    updatedTiles[oldPosition.y][oldPosition.x].occupantId = null
  }

  // Set new tile
  if (updatedTiles[destination.y]?.[destination.x]) {
    updatedTiles[destination.y][destination.x].occupantId = unitId
  }

  // Update unit state
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

  // Create updated state
  const updatedState: TacticalStateData = {
    ...state,
    tiles: updatedTiles,
    units: updatedUnits
  }

  // Save to database
  await activityParticipationRepository.updateTacticalState(participationId, updatedState)

  return {
    success: true,
    newPosition: destination,
    updatedState
  }
}
