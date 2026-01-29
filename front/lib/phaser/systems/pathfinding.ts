import type { GridPosition, TileState, TacticalUnit } from '@shared/types/tactical-combat.types'
import { TERRAIN_CONFIG } from '@shared/constants/terrain'

// Node for pathfinding
interface PathNode {
  position: GridPosition
  cost: number // Total cost to reach this node
  parent: PathNode | null
}

// Priority queue item for Dijkstra
interface PriorityQueueItem {
  position: GridPosition
  cost: number
}

/**
 * Calculate all reachable tiles within movement range using Dijkstra's algorithm.
 * Accounts for terrain movement costs and blocked tiles.
 *
 * @param start - Starting grid position
 * @param movementPoints - Total movement budget
 * @param tiles - 2D array of tile states
 * @param allUnits - All units on the grid (for occupancy checking)
 * @param isPlayerUnit - Whether the moving unit is a player (affects which units block)
 * @returns Array of reachable grid positions (excluding start position)
 */
export function calculateMovementRange(
  start: GridPosition,
  movementPoints: number,
  tiles: TileState[][],
  allUnits: TacticalUnit[],
  isPlayerUnit: boolean
): GridPosition[] {
  const gridHeight = tiles.length
  const gridWidth = tiles[0]?.length ?? 0

  if (gridWidth === 0 || gridHeight === 0) return []

  // Build occupancy map (enemy units block movement)
  const occupiedByEnemy = new Set<string>()
  for (const unit of allUnits) {
    // Enemies block player movement, players block enemy movement
    if (unit.isPlayer !== isPlayerUnit) {
      occupiedByEnemy.add(`${unit.position.x},${unit.position.y}`)
    }
  }

  // Distance map: stores minimum cost to reach each tile
  const distances = new Map<string, number>()
  const posKey = (pos: GridPosition) => `${pos.x},${pos.y}`

  // Priority queue (simple array, sorted by cost)
  const queue: PriorityQueueItem[] = []

  // Initialize with start position
  distances.set(posKey(start), 0)
  queue.push({ position: start, cost: 0 })

  // Reachable tiles (excluding start)
  const reachable: GridPosition[] = []

  // Cardinal directions (no diagonal movement for simpler tactical combat)
  const directions = [
    { dx: 0, dy: -1 }, // North
    { dx: 1, dy: 0 },  // East
    { dx: 0, dy: 1 },  // South
    { dx: -1, dy: 0 }  // West
  ]

  while (queue.length > 0) {
    // Sort and get lowest cost node
    queue.sort((a, b) => a.cost - b.cost)
    const current = queue.shift()!

    // Skip if we've found a better path to this tile
    const currentKey = posKey(current.position)
    if (distances.has(currentKey) && distances.get(currentKey)! < current.cost) {
      continue
    }

    // Explore neighbors
    for (const dir of directions) {
      const nextX = current.position.x + dir.dx
      const nextY = current.position.y + dir.dy
      const nextPos: GridPosition = { x: nextX, y: nextY }
      const nextKey = posKey(nextPos)

      // Check bounds
      if (nextX < 0 || nextX >= gridWidth || nextY < 0 || nextY >= gridHeight) {
        continue
      }

      // Get tile
      const tile = tiles[nextY]?.[nextX]
      if (!tile) continue

      // Check if walkable
      if (!tile.isWalkable) continue

      // Check if blocked by enemy
      if (occupiedByEnemy.has(nextKey)) continue

      // Calculate movement cost
      const terrainConfig = TERRAIN_CONFIG[tile.terrain]
      const moveCost = terrainConfig?.movementCost ?? 1

      // Skip if movement cost is infinite (obstacles)
      if (!Number.isFinite(moveCost)) continue

      const totalCost = current.cost + moveCost

      // Skip if exceeds movement budget
      if (totalCost > movementPoints) continue

      // Check if this is a better path
      if (!distances.has(nextKey) || distances.get(nextKey)! > totalCost) {
        distances.set(nextKey, totalCost)
        queue.push({ position: nextPos, cost: totalCost })

        // Add to reachable (don't add start position)
        if (nextX !== start.x || nextY !== start.y) {
          // Check if already in reachable list
          const alreadyAdded = reachable.some(p => p.x === nextX && p.y === nextY)
          if (!alreadyAdded) {
            reachable.push(nextPos)
          }
        }
      }
    }
  }

  return reachable
}

/**
 * Calculate the shortest path between two points using A* algorithm.
 * Used for movement animation path calculation.
 *
 * @param start - Starting grid position
 * @param end - Target grid position
 * @param tiles - 2D array of tile states
 * @param allUnits - All units on the grid
 * @param isPlayerUnit - Whether the moving unit is a player
 * @returns Array of positions forming the path (including start and end), or empty if no path
 */
export function calculatePath(
  start: GridPosition,
  end: GridPosition,
  tiles: TileState[][],
  allUnits: TacticalUnit[],
  isPlayerUnit: boolean
): GridPosition[] {
  const gridHeight = tiles.length
  const gridWidth = tiles[0]?.length ?? 0

  if (gridWidth === 0 || gridHeight === 0) return []

  // Build occupancy map
  const occupiedByEnemy = new Set<string>()
  for (const unit of allUnits) {
    if (unit.isPlayer !== isPlayerUnit) {
      // Allow moving to a tile occupied by enemy if it's the target (for attacks)
      const key = `${unit.position.x},${unit.position.y}`
      if (unit.position.x !== end.x || unit.position.y !== end.y) {
        occupiedByEnemy.add(key)
      }
    }
  }

  const posKey = (pos: GridPosition) => `${pos.x},${pos.y}`

  // Heuristic: Manhattan distance
  const heuristic = (pos: GridPosition) =>
    Math.abs(pos.x - end.x) + Math.abs(pos.y - end.y)

  // Open set with f-score priority
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
    // Get node with lowest f-score
    openSet.sort((a, b) => a.fScore - b.fScore)
    const current = openSet.shift()!

    // Check if we reached the goal
    if (current.pos.x === end.x && current.pos.y === end.y) {
      // Reconstruct path
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

    // Explore neighbors
    for (const dir of directions) {
      const nextX = current.pos.x + dir.dx
      const nextY = current.pos.y + dir.dy
      const nextPos: GridPosition = { x: nextX, y: nextY }
      const nextKey = posKey(nextPos)

      // Check bounds
      if (nextX < 0 || nextX >= gridWidth || nextY < 0 || nextY >= gridHeight) {
        continue
      }

      // Get tile
      const tile = tiles[nextY]?.[nextX]
      if (!tile || !tile.isWalkable) continue

      // Check if blocked by enemy (unless it's the destination)
      if (occupiedByEnemy.has(nextKey)) continue

      // Calculate cost
      const terrainConfig = TERRAIN_CONFIG[tile.terrain]
      const moveCost = terrainConfig?.movementCost ?? 1

      if (!Number.isFinite(moveCost)) continue

      const tentativeGScore = currentGScore + moveCost

      if (tentativeGScore < (gScore.get(nextKey) ?? Infinity)) {
        cameFrom.set(nextKey, current.pos)
        gScore.set(nextKey, tentativeGScore)

        const fScore = tentativeGScore + heuristic(nextPos)

        // Add to open set if not already there
        const inOpenSet = openSet.some(item => item.pos.x === nextX && item.pos.y === nextY)
        if (!inOpenSet) {
          openSet.push({ pos: nextPos, fScore })
        }
      }
    }
  }

  // No path found
  return []
}

/**
 * Calculate all tiles within attack range using Manhattan distance.
 * Does not account for terrain (attacks go over obstacles).
 *
 * @param center - Center position
 * @param range - Attack range
 * @param gridWidth - Grid width
 * @param gridHeight - Grid height
 * @returns Array of positions within range
 */
export function calculateAttackRange(
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

/**
 * Get the movement cost for a path.
 *
 * @param path - Array of positions in the path
 * @param tiles - 2D array of tile states
 * @returns Total movement cost, or Infinity if path is invalid
 */
export function getPathCost(path: GridPosition[], tiles: TileState[][]): number {
  if (path.length < 2) return 0

  let totalCost = 0

  for (let i = 1; i < path.length; i++) {
    const pos = path[i]
    const tile = tiles[pos.y]?.[pos.x]

    if (!tile || !tile.isWalkable) return Infinity

    const terrainConfig = TERRAIN_CONFIG[tile.terrain]
    const moveCost = terrainConfig?.movementCost ?? 1

    if (!Number.isFinite(moveCost)) return Infinity

    totalCost += moveCost
  }

  return totalCost
}

/**
 * Check if a position is within range of a center position.
 *
 * @param center - Center position
 * @param target - Target position to check
 * @param range - Maximum range
 * @returns True if target is within range
 */
export function isInRange(center: GridPosition, target: GridPosition, range: number): boolean {
  const distance = Math.abs(center.x - target.x) + Math.abs(center.y - target.y)
  return distance <= range
}
