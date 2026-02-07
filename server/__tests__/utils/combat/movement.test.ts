import { describe, expect, it } from 'vitest'
import {
  getManhattanDistance,
  findClosestPlayer,
  validateTacticalMove,
  calculateMovementRange,
  calculateAIPath,
  findBestMoveTowardTarget
} from '../../../utils/combat/movement'
import {
  createTestGrid,
  createTestUnit,
  createTestTacticalState,
  placeWall
} from '../../fixtures/tactical-state.fixtures'
import { TerrainType } from '@shared/types/tactical-combat.types'

describe('movement utilities', () => {
  // ---------- getManhattanDistance ----------
  describe('getManhattanDistance', () => {
    it('should return 0 for same position', () => {
      expect(getManhattanDistance({ x: 3, y: 4 }, { x: 3, y: 4 })).toBe(0)
    })

    it('should return correct horizontal distance', () => {
      expect(getManhattanDistance({ x: 0, y: 0 }, { x: 5, y: 0 })).toBe(5)
    })

    it('should return correct vertical distance', () => {
      expect(getManhattanDistance({ x: 0, y: 0 }, { x: 0, y: 3 })).toBe(3)
    })

    it('should return correct diagonal distance', () => {
      expect(getManhattanDistance({ x: 1, y: 1 }, { x: 4, y: 5 })).toBe(7)
    })

    it('should be symmetric', () => {
      const a = { x: 2, y: 3 }
      const b = { x: 5, y: 1 }
      expect(getManhattanDistance(a, b)).toBe(getManhattanDistance(b, a))
    })
  })

  // ---------- findClosestPlayer ----------
  describe('findClosestPlayer', () => {
    it('should find the closest player unit', () => {
      const units = [
        createTestUnit({ id: 'player-1', position: { x: 0, y: 0 } }),
        createTestUnit({ id: 'player-2', position: { x: 2, y: 0 } }),
        createTestUnit({ id: 'enemy-1', position: { x: 5, y: 0 } })
      ]
      const result = findClosestPlayer({ x: 3, y: 0 }, units)
      expect(result?.id).toBe('player-2')
    })

    it('should return null when no player units exist', () => {
      const units = [createTestUnit({ id: 'enemy-1', position: { x: 0, y: 0 } })]
      expect(findClosestPlayer({ x: 5, y: 0 }, units)).toBeNull()
    })

    it('should ignore dead players', () => {
      const units = [
        createTestUnit({ id: 'player-1', position: { x: 1, y: 0 }, currentHealth: 0 }),
        createTestUnit({ id: 'player-2', position: { x: 5, y: 0 } })
      ]
      const result = findClosestPlayer({ x: 0, y: 0 }, units)
      expect(result?.id).toBe('player-2')
    })

    it('should return null when all players are dead', () => {
      const units = [
        createTestUnit({ id: 'player-1', position: { x: 1, y: 0 }, currentHealth: 0 })
      ]
      expect(findClosestPlayer({ x: 0, y: 0 }, units)).toBeNull()
    })
  })

  // ---------- validateTacticalMove ----------
  describe('validateTacticalMove', () => {
    it('should accept a valid cardinal movement', () => {
      const state = createTestTacticalState({
        gridWidth: 5,
        gridHeight: 5,
        units: [createTestUnit({ id: 'player-1', position: { x: 1, y: 1 } })],
        turnOrder: ['player-1'],
        currentTurnIndex: 0
      })
      const result = validateTacticalMove(state, 'player-1', [
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 3, y: 1 }
      ])
      expect(result.valid).toBe(true)
      expect(result.pathCost).toBe(2)
    })

    it('should reject path with fewer than 2 positions', () => {
      const state = createTestTacticalState()
      const result = validateTacticalMove(state, 'player-1', [{ x: 1, y: 3 }])
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('at least 2')
    })

    it('should reject when unit not found', () => {
      const state = createTestTacticalState()
      const result = validateTacticalMove(state, 'nonexistent', [
        { x: 0, y: 0 },
        { x: 1, y: 0 }
      ])
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('not found')
    })

    it('should reject when not unit turn', () => {
      const state = createTestTacticalState({
        gridWidth: 5,
        gridHeight: 5,
        units: [
          createTestUnit({ id: 'player-1', position: { x: 0, y: 0 } }),
          createTestUnit({ id: 'enemy-1', position: { x: 4, y: 4 } })
        ],
        turnOrder: ['enemy-1', 'player-1'],
        currentTurnIndex: 0 // enemy-1's turn
      })
      const result = validateTacticalMove(state, 'player-1', [
        { x: 0, y: 0 },
        { x: 1, y: 0 }
      ])
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('turn')
    })

    it('should reject when unit has already moved', () => {
      const state = createTestTacticalState({
        gridWidth: 5,
        gridHeight: 5,
        units: [createTestUnit({ id: 'player-1', position: { x: 0, y: 0 }, hasMoved: true })],
        turnOrder: ['player-1'],
        currentTurnIndex: 0
      })
      const result = validateTacticalMove(state, 'player-1', [
        { x: 0, y: 0 },
        { x: 1, y: 0 }
      ])
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('already moved')
    })

    it('should reject path that does not start at unit position', () => {
      const state = createTestTacticalState({
        gridWidth: 5,
        gridHeight: 5,
        units: [createTestUnit({ id: 'player-1', position: { x: 0, y: 0 } })],
        turnOrder: ['player-1'],
        currentTurnIndex: 0
      })
      const result = validateTacticalMove(state, 'player-1', [
        { x: 2, y: 2 }, // Wrong start
        { x: 3, y: 2 }
      ])
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('current position')
    })

    it('should reject path with non-adjacent step (diagonal)', () => {
      const state = createTestTacticalState({
        gridWidth: 5,
        gridHeight: 5,
        units: [createTestUnit({ id: 'player-1', position: { x: 0, y: 0 } })],
        turnOrder: ['player-1'],
        currentTurnIndex: 0
      })
      const result = validateTacticalMove(state, 'player-1', [
        { x: 0, y: 0 },
        { x: 1, y: 1 } // diagonal
      ])
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('non-adjacent')
    })

    it('should reject path going out of bounds', () => {
      const state = createTestTacticalState({
        gridWidth: 5,
        gridHeight: 5,
        units: [createTestUnit({ id: 'player-1', position: { x: 0, y: 0 } })],
        turnOrder: ['player-1'],
        currentTurnIndex: 0
      })
      const result = validateTacticalMove(state, 'player-1', [
        { x: 0, y: 0 },
        { x: -1, y: 0 } // out of bounds
      ])
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('out of bounds')
    })

    it('should reject path through unwalkable tile', () => {
      const tiles = createTestGrid(5, 5)
      placeWall(tiles, { x: 1, y: 0 })
      const state = createTestTacticalState({
        gridWidth: 5,
        gridHeight: 5,
        tiles,
        units: [createTestUnit({ id: 'player-1', position: { x: 0, y: 0 } })],
        turnOrder: ['player-1'],
        currentTurnIndex: 0
      })
      const result = validateTacticalMove(state, 'player-1', [
        { x: 0, y: 0 },
        { x: 1, y: 0 } // wall
      ])
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('unwalkable')
    })

    it('should reject path ending on occupied tile', () => {
      const state = createTestTacticalState({
        gridWidth: 5,
        gridHeight: 5,
        units: [
          createTestUnit({ id: 'player-1', position: { x: 0, y: 0 } }),
          createTestUnit({ id: 'enemy-1', position: { x: 1, y: 0 } })
        ],
        turnOrder: ['player-1', 'enemy-1'],
        currentTurnIndex: 0
      })
      const result = validateTacticalMove(state, 'player-1', [
        { x: 0, y: 0 },
        { x: 1, y: 0 } // occupied by enemy
      ])
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('occupied')
    })
  })

  // ---------- calculateMovementRange ----------
  describe('calculateMovementRange', () => {
    it('should return reachable tiles within movement points', () => {
      const tiles = createTestGrid(5, 5)
      const units = [createTestUnit({ id: 'player-1', position: { x: 2, y: 2 } })]
      const range = calculateMovementRange({ x: 2, y: 2 }, 1, tiles, units, true)
      // 4 cardinal directions each 1 step away
      expect(range.size).toBe(4)
      expect(range.has('3,2')).toBe(true)
      expect(range.has('1,2')).toBe(true)
      expect(range.has('2,1')).toBe(true)
      expect(range.has('2,3')).toBe(true)
    })

    it('should respect obstacles', () => {
      const tiles = createTestGrid(5, 5)
      placeWall(tiles, { x: 3, y: 2 })
      const units = [createTestUnit({ id: 'player-1', position: { x: 2, y: 2 } })]
      const range = calculateMovementRange({ x: 2, y: 2 }, 1, tiles, units, true)
      expect(range.has('3,2')).toBe(false)
      expect(range.size).toBe(3)
    })

    it('should not include start position', () => {
      const tiles = createTestGrid(5, 5)
      const units = [createTestUnit({ id: 'player-1', position: { x: 2, y: 2 } })]
      const range = calculateMovementRange({ x: 2, y: 2 }, 3, tiles, units, true)
      expect(range.has('2,2')).toBe(false)
    })

    it('should block movement through enemy units', () => {
      const tiles = createTestGrid(5, 5)
      const units = [
        createTestUnit({ id: 'player-1', position: { x: 0, y: 0 } }),
        createTestUnit({ id: 'enemy-1', position: { x: 1, y: 0 } })
      ]
      const range = calculateMovementRange({ x: 0, y: 0 }, 3, tiles, units, true)
      // Can't move through enemy at (1,0)
      expect(range.has('1,0')).toBe(false)
      expect(range.has('2,0')).toBe(false) // Can't reach because blocked
    })

    it('should return empty map for 0 movement', () => {
      const tiles = createTestGrid(5, 5)
      const units = [createTestUnit({ id: 'player-1', position: { x: 2, y: 2 } })]
      const range = calculateMovementRange({ x: 2, y: 2 }, 0, tiles, units, true)
      expect(range.size).toBe(0)
    })
  })

  // ---------- calculateAIPath ----------
  describe('calculateAIPath', () => {
    it('should find a straight path on open grid', () => {
      const tiles = createTestGrid(5, 5)
      const units = [createTestUnit({ id: 'enemy-1', position: { x: 0, y: 0 } })]
      const path = calculateAIPath({ x: 0, y: 0 }, { x: 3, y: 0 }, tiles, units, 'enemy-1')
      expect(path.length).toBeGreaterThanOrEqual(4)
      expect(path[0]).toEqual({ x: 0, y: 0 })
      expect(path[path.length - 1]).toEqual({ x: 3, y: 0 })
    })

    it('should navigate around obstacles', () => {
      const tiles = createTestGrid(5, 5)
      placeWall(tiles, { x: 1, y: 0 })
      const units = [createTestUnit({ id: 'enemy-1', position: { x: 0, y: 0 } })]
      const path = calculateAIPath({ x: 0, y: 0 }, { x: 2, y: 0 }, tiles, units, 'enemy-1')
      expect(path.length).toBeGreaterThan(0)
      expect(path[path.length - 1]).toEqual({ x: 2, y: 0 })
      // Should not go through the wall
      expect(path.find((p) => p.x === 1 && p.y === 0)).toBeUndefined()
    })

    it('should return empty path when destination unreachable', () => {
      const tiles = createTestGrid(3, 1)
      placeWall(tiles, { x: 1, y: 0 })
      const units = [createTestUnit({ id: 'enemy-1', position: { x: 0, y: 0 } })]
      const path = calculateAIPath({ x: 0, y: 0 }, { x: 2, y: 0 }, tiles, units, 'enemy-1')
      expect(path).toHaveLength(0)
    })

    it('should return path of length 1 when start equals end', () => {
      const tiles = createTestGrid(3, 3)
      const units = [createTestUnit({ id: 'enemy-1', position: { x: 1, y: 1 } })]
      const path = calculateAIPath({ x: 1, y: 1 }, { x: 1, y: 1 }, tiles, units, 'enemy-1')
      expect(path).toHaveLength(1)
      expect(path[0]).toEqual({ x: 1, y: 1 })
    })
  })

  // ---------- findBestMoveTowardTarget ----------
  describe('findBestMoveTowardTarget', () => {
    it('should move toward the target', () => {
      const tiles = createTestGrid(8, 7)
      const enemy = createTestUnit({ id: 'enemy-1', position: { x: 0, y: 3 } })
      const target = createTestUnit({ id: 'player-1', position: { x: 6, y: 3 } })
      const units = [enemy, target]
      const range = calculateMovementRange(enemy.position, 3, tiles, units, false)
      const result = findBestMoveTowardTarget(enemy, target, range, tiles, units, 1)
      expect(result).not.toBeNull()
      // Should move closer to target (distance should decrease)
      const oldDist = getManhattanDistance(enemy.position, target.position)
      const newDist = getManhattanDistance(result!.position, target.position)
      expect(newDist).toBeLessThan(oldDist)
    })

    it('should return null when no reachable tiles', () => {
      const tiles = createTestGrid(5, 5)
      const enemy = createTestUnit({ id: 'enemy-1', position: { x: 2, y: 2 } })
      const target = createTestUnit({ id: 'player-1', position: { x: 4, y: 4 } })
      const emptyRange = new Map<string, { position: { x: number; y: number }; cost: number }>()
      const result = findBestMoveTowardTarget(enemy, target, emptyRange, tiles, [enemy, target], 1)
      expect(result).toBeNull()
    })

    it('should prefer tiles in attack range', () => {
      const tiles = createTestGrid(5, 5)
      const enemy = createTestUnit({ id: 'enemy-1', position: { x: 0, y: 2 } })
      const target = createTestUnit({ id: 'player-1', position: { x: 2, y: 2 } })
      const units = [enemy, target]
      const range = calculateMovementRange(enemy.position, 2, tiles, units, false)
      const result = findBestMoveTowardTarget(enemy, target, range, tiles, units, 1)
      expect(result).not.toBeNull()
      // Should be exactly 1 tile away (attack range)
      const dist = getManhattanDistance(result!.position, target.position)
      expect(dist).toBeLessThanOrEqual(1)
    })
  })
})
