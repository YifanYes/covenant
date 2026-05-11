import { describe, expect, it } from 'vitest'
import { createTacticalStateWithNewEnemy } from '../../../utils/combat/rewards'
import { TACTICAL_STATE_VERSION } from '@shared/types/tactical-combat.types'
import { createTestTacticalState, createTestUnit } from '../../fixtures/tactical-state.fixtures'

const newEnemyArgs = (override?: Partial<{ id: string; templateId: string; name: string; health: { current: number; max: number }; mana: { current: number; max: number } }>) => ({
  id: 'new-enemy-1',
  templateId: 'skeleton',
  name: 'Goblin|Warrior',
  health: { current: 12, max: 12 },
  mana: { current: 0, max: 0 },
  stats: { strengthAtk: 5, strengthDef: 5, magicAtk: 5, magicDef: 5, speed: 0 },
  tier: 1,
  moves: ['basic_strike'],
  ...override
})

describe('rewards utilities', () => {
  describe('createTacticalStateWithNewEnemy', () => {
    it('should create state with player and new enemy', () => {
      const currentState = createTestTacticalState({
        gridWidth: 8,
        gridHeight: 7,
        units: [
          createTestUnit({ id: 'player-1', position: { x: 1, y: 3 }, currentHealth: 8, maxHealth: 10, speed: 5 })
        ]
      })
      const playerUnit = currentState.units[0]

      const result = createTacticalStateWithNewEnemy(currentState, playerUnit, newEnemyArgs())

      expect(result.stateVersion).toBe(TACTICAL_STATE_VERSION)
      expect(result.units).toHaveLength(2)

      const player = result.units.find((u) => u.id === 'player-1')
      expect(player).toBeDefined()
      expect(player!.currentHealth).toBe(8)
      expect(player!.hasMoved).toBe(false)
      expect(player!.hasActed).toBe(false)

      const enemy = result.units.find((u) => u.id === 'new-enemy-1')
      expect(enemy).toBeDefined()
      expect(enemy!.name).toBe('Goblin|Warrior')
      expect(enemy!.currentHealth).toBe(12)
      expect(enemy!.maxHealth).toBe(12)
    })

    it('should set turn order with higher-speed unit first', () => {
      const currentState = createTestTacticalState({
        gridWidth: 8,
        gridHeight: 7,
        units: [createTestUnit({ id: 'player-1', position: { x: 1, y: 3 }, speed: 5 })]
      })
      const result = createTacticalStateWithNewEnemy(currentState, currentState.units[0], newEnemyArgs({ id: 'enemy-new', name: 'Test|Enemy', health: { current: 5, max: 5 } }))
      // Player has speed 5, enemy speed 0 → player acts first.
      expect(result.turnOrder[0]).toBe('player-1')
      expect(result.turnOrder[1]).toBe('enemy-new')
      expect(result.currentTurnIndex).toBe(0)
      expect(result.turnNumber).toBe(1)
    })

    it('should preserve player position', () => {
      const currentState = createTestTacticalState({
        gridWidth: 8,
        gridHeight: 7,
        units: [createTestUnit({ id: 'player-1', position: { x: 3, y: 5 }, speed: 5 })]
      })
      const result = createTacticalStateWithNewEnemy(currentState, currentState.units[0], newEnemyArgs({ id: 'e2', name: 'E|2', health: { current: 10, max: 10 } }))
      const player = result.units.find((u) => u.id === 'player-1')
      expect(player!.position).toEqual({ x: 3, y: 5 })
    })

    it('should create enemy without position (no grid)', () => {
      const currentState = createTestTacticalState({
        gridWidth: 8,
        gridHeight: 7,
        units: [createTestUnit({ id: 'player-1', position: { x: 1, y: 3 }, speed: 5 })]
      })
      const result = createTacticalStateWithNewEnemy(currentState, currentState.units[0], newEnemyArgs({ id: 'e3', name: 'E|3', health: { current: 6, max: 6 } }))
      const enemy = result.units.find((u) => u.id === 'e3')
      expect(enemy).toBeDefined()
      expect(enemy!.position).toBeUndefined()
    })

    it('should preserve grid dimensions and map template', () => {
      const currentState = createTestTacticalState({
        gridWidth: 8,
        gridHeight: 7
      })
      const result = createTacticalStateWithNewEnemy(currentState, currentState.units[0], newEnemyArgs({ id: 'e5', name: 'E|5', health: { current: 4, max: 4 } }))
      expect(result.gridWidth).toBe(8)
      expect(result.gridHeight).toBe(7)
      expect(result.mapTemplateId).toBe('test-map')
    })

    it('should not include old enemy in units after new enemy spawn', () => {
      const currentState = createTestTacticalState({
        gridWidth: 8,
        gridHeight: 7,
        units: [
          createTestUnit({ id: 'player-1', position: { x: 1, y: 3 }, speed: 5 }),
          createTestUnit({ id: 'old-enemy', position: { x: 6, y: 3 } })
        ]
      })
      const result = createTacticalStateWithNewEnemy(currentState, currentState.units[0], newEnemyArgs({ id: 'new-enemy', name: 'New|Enemy', health: { current: 10, max: 10 } }))
      expect(result.units.find((u) => u.id === 'old-enemy')).toBeUndefined()
      expect(result.units.find((u) => u.id === 'new-enemy')).toBeDefined()
    })
  })
})
