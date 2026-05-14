import { describe, expect, it, vi } from 'vitest'
import { createTacticalStateWithNewEnemy, processEnemyDefeat } from '../../../utils/combat/rewards'
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

  describe('processEnemyDefeat — guild gold multiplier (Phase 3)', () => {
    function makeRepos(multipliedGold: number) {
      const characterRepo = {
        addGold: vi.fn().mockResolvedValue(undefined),
        findByIdWithClasses: vi.fn().mockResolvedValue(null)
      }
      const characterQuestRepo = {
        updateProgress: vi.fn().mockResolvedValue(undefined),
        findById: vi
          .fn()
          .mockResolvedValueOnce({ id: 'q-1', characterId: 'char-1', questId: 'unknown', progress: 1, target: 1000 })
          .mockResolvedValueOnce({ id: 'q-1', characterId: 'char-1', questId: 'unknown', progress: 1, target: 1000 }),
        getCombatStats: vi.fn().mockResolvedValue(null),
        updateCombatStats: vi.fn().mockResolvedValue(undefined),
        updateTacticalState: vi.fn().mockResolvedValue(undefined),
        complete: vi.fn().mockResolvedValue(undefined)
      }
      const combatEnemyRepo = {
        getActiveEnemy: vi
          .fn()
          .mockResolvedValue({ id: 'enemy-1', templateId: 'skeleton', currentHealth: 0 }),
        defeatEnemy: vi.fn().mockResolvedValue(undefined),
        findById: vi.fn(),
        createEnemy: vi.fn().mockResolvedValue({ id: 'enemy-2' })
      }
      const guildService = {
        applyCombatRewards: vi.fn().mockResolvedValue(multipliedGold)
      }
      return { characterRepo, characterQuestRepo, combatEnemyRepo, guildService }
    }

    it('returns the post-multiplier gold from applyCombatRewards', async () => {
      // Deterministic base gold: stub random to mid-range. skeleton range 8-12 → base=8.
      const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
      const { characterRepo, characterQuestRepo, combatEnemyRepo, guildService } = makeRepos(9)

      const state = createTestTacticalState({
        units: [createTestUnit({ id: 'player-1' }), createTestUnit({ id: 'enemy-1' })]
      })

      const result = await processEnemyDefeat(
        'q-1',
        state,
        ['enemy-1'],
        {
          characterRepository: characterRepo as any,
          characterQuestRepository: characterQuestRepo as any,
          combatEnemyRepository: combatEnemyRepo as any,
          guildService: guildService as any
        },
        'user-1'
      )

      expect(guildService.applyCombatRewards).toHaveBeenCalledWith('user-1', 8)
      expect(result.goldReward).toBe(9)
      expect(characterRepo.addGold).toHaveBeenCalledWith('char-1', 9)

      randSpy.mockRestore()
    })

    it('uses base gold when no guildService is injected', async () => {
      const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
      const { characterRepo, characterQuestRepo, combatEnemyRepo } = makeRepos(8)

      const state = createTestTacticalState({
        units: [createTestUnit({ id: 'player-1' }), createTestUnit({ id: 'enemy-1' })]
      })

      const result = await processEnemyDefeat(
        'q-1',
        state,
        ['enemy-1'],
        {
          characterRepository: characterRepo as any,
          characterQuestRepository: characterQuestRepo as any,
          combatEnemyRepository: combatEnemyRepo as any
        },
        'user-1'
      )

      expect(result.goldReward).toBe(8)
      randSpy.mockRestore()
    })

    it('falls back to base gold if applyCombatRewards throws', async () => {
      const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
      const { characterRepo, characterQuestRepo, combatEnemyRepo, guildService } = makeRepos(0)
      guildService.applyCombatRewards.mockRejectedValue(new Error('db down'))

      const state = createTestTacticalState({
        units: [createTestUnit({ id: 'player-1' }), createTestUnit({ id: 'enemy-1' })]
      })

      const result = await processEnemyDefeat(
        'q-1',
        state,
        ['enemy-1'],
        {
          characterRepository: characterRepo as any,
          characterQuestRepository: characterQuestRepo as any,
          combatEnemyRepository: combatEnemyRepo as any,
          guildService: guildService as any
        },
        'user-1'
      )

      expect(result.goldReward).toBe(8)
      // Character should still credited from the base gold despite the buff path failing.
      expect(characterRepo.addGold).toHaveBeenCalledWith('char-1', 8)
      randSpy.mockRestore()
    })
  })
})
