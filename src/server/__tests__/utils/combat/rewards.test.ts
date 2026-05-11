import { describe, expect, it } from 'vitest'
import { createTacticalStateWithNewEnemy } from '../../../utils/combat/rewards'
import { createTestTacticalState, createTestUnit } from '../../fixtures/tactical-state.fixtures'

const newEnemyArgs = (
  override?: Partial<{
    id: string
    templateId: string
    name: string
    health: { current: number; max: number }
    mana: { current: number; max: number }
  }>
) => ({
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
        units: [createTestUnit({ id: 'player-1', currentHealth: 8, maxHealth: 10, speed: 5 })]
      })
      const playerUnit = currentState.units[0]

      const result = createTacticalStateWithNewEnemy(currentState, playerUnit, newEnemyArgs())

      expect(result.units).toHaveLength(2)

      const player = result.units.find((u) => u.id === 'player-1')
      expect(player).toBeDefined()
      expect(player!.currentHealth).toBe(8)

      const enemy = result.units.find((u) => u.id === 'new-enemy-1')
      expect(enemy).toBeDefined()
      expect(enemy!.name).toBe('Goblin|Warrior')
      expect(enemy!.currentHealth).toBe(12)
      expect(enemy!.maxHealth).toBe(12)
      expect(enemy!.templateId).toBe('skeleton')
    })

    it('should set turn order with higher-speed unit first', () => {
      const currentState = createTestTacticalState({
        units: [createTestUnit({ id: 'player-1', speed: 5 })]
      })
      const result = createTacticalStateWithNewEnemy(
        currentState,
        currentState.units[0],
        newEnemyArgs({ id: 'enemy-new', name: 'Test|Enemy', health: { current: 5, max: 5 } })
      )
      expect(result.turnOrder[0]).toBe('player-1')
      expect(result.turnOrder[1]).toBe('enemy-new')
      expect(result.currentTurnIndex).toBe(0)
    })

    it('should not include old enemy in units after new enemy spawn', () => {
      const currentState = createTestTacticalState({
        units: [createTestUnit({ id: 'player-1', speed: 5 }), createTestUnit({ id: 'old-enemy' })]
      })
      const result = createTacticalStateWithNewEnemy(
        currentState,
        currentState.units[0],
        newEnemyArgs({ id: 'new-enemy', name: 'New|Enemy', health: { current: 10, max: 10 } })
      )
      expect(result.units.find((u) => u.id === 'old-enemy')).toBeUndefined()
      expect(result.units.find((u) => u.id === 'new-enemy')).toBeDefined()
    })
  })
})
