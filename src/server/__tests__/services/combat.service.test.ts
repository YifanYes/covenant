import { RESOURCE_NOT_FOUND_OR_FORBIDDEN } from '@/server/lib/errors'
import { ItemType } from '@shared/types/gamification.types'
import type { TacticalMoveResult, TacticalStateData } from '@shared/types/tactical-combat.types'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CharacterQuestRepository } from '../../repositories/character-quest.repository'
import type { CharacterRepository } from '../../repositories/character.repository'
import type { CharacterService } from '../../services/character.service'
import { CombatService } from '../../services/combat.service'
import { createRepoMock } from '../helpers/mock-repo'

const executeMoveMock = vi.fn()
const executeEnemyMoveMock = vi.fn()
vi.mock('../../utils/combat/move-resolution', () => ({
  executeMove: (args: unknown) => executeMoveMock(args),
  executeEnemyMove: (args: unknown) => executeEnemyMoveMock(args)
}))

const createMockCharacter = (
  health: number,
  maxHealth: number,
  mana: number,
  maxMana: number,
  inventory: unknown[] = []
) => ({
  id: 'char-1',
  name: 'Test Character',
  currentClass: 'knight',
  data: {},
  manaReserve: 0,
  inventory,
  loadout: [],
  classes: [
    {
      id: 'class-1',
      className: 'knight',
      health,
      maxHealth,
      mana,
      maxMana,
      tier: 1,
      strengthAtk: 5,
      strengthDef: 5,
      magicAtk: 5,
      magicDef: 5,
      speed: 1,
      manaRegen: 0,
      equippedAbilities: []
    }
  ]
})

const createTacticalStateForConsumable = (playerHealth: number, maxHealth: number): TacticalStateData => ({
  units: [
    {
      id: 'player-1',
      name: 'Player',
      currentHealth: playerHealth,
      maxHealth,
      currentMana: 0,
      maxMana: 0,
      speed: 1,
      strengthAtk: 5,
      strengthDef: 5,
      magicAtk: 5,
      magicDef: 5
    }
  ],
  turnOrder: ['player-1'],
  currentTurnIndex: 0
})

describe('CombatService (Phase 2A)', () => {
  let combatService: CombatService
  let mockCharacterRepo: ReturnType<typeof createRepoMock<CharacterRepository>>
  let mockCharacterQuestRepo: ReturnType<typeof createRepoMock<CharacterQuestRepository>>
  let mockCharacterService: ReturnType<typeof createRepoMock<CharacterService>>

  beforeEach(() => {
    vi.clearAllMocks()

    mockCharacterRepo = createRepoMock<CharacterRepository>()
    mockCharacterQuestRepo = createRepoMock<CharacterQuestRepository>()
    mockCharacterQuestRepo.verifyOwnership.mockResolvedValue(true)
    mockCharacterQuestRepo.findByPublicId.mockResolvedValue({ id: BigInt(1), publicId: 'qstpub000001' })
    mockCharacterService = createRepoMock<CharacterService>()

    combatService = new CombatService(mockCharacterRepo, mockCharacterQuestRepo, mockCharacterService)
  })

  describe('useConsumable (health_potion)', () => {
    it('restores health and removes the consumable when used outside combat', async () => {
      const inventory = [{ id: 'item-1', type: ItemType.CONSUMABLE, definitionId: 'health_potion' }]
      mockCharacterRepo.findWithClassesOrThrow.mockResolvedValue(createMockCharacter(20, 50, 5, 10, inventory))
      mockCharacterQuestRepo.findActiveByCharacterId.mockResolvedValue(null)

      const result = await combatService.useConsumable('user-1', 'health_potion')

      expect(result.success).toBe(true)
      // health_potion now restores 15 HP (Phase 2A: HP×5 means heal also scales ×5)
      expect(result.healthRestored).toBe(15)
      expect(mockCharacterRepo.updateHealth).toHaveBeenCalledWith('class-1', 35, 5)
      expect(mockCharacterRepo.updateInventoryAndLoadout).toHaveBeenCalled()
    })

    it('caps health restoration at max health', async () => {
      const inventory = [{ id: 'item-1', type: ItemType.CONSUMABLE, definitionId: 'health_potion' }]
      mockCharacterRepo.findWithClassesOrThrow.mockResolvedValue(createMockCharacter(45, 50, 5, 10, inventory))
      mockCharacterQuestRepo.findActiveByCharacterId.mockResolvedValue(null)

      const result = await combatService.useConsumable('user-1', 'health_potion')

      expect(result.success).toBe(true)
      // Only 5 HP missing → only 5 restored
      expect(result.healthRestored).toBe(5)
      expect(mockCharacterRepo.updateHealth).toHaveBeenCalledWith('class-1', 50, 5)
    })

    it('throws if consumable not in inventory', async () => {
      mockCharacterRepo.findWithClassesOrThrow.mockResolvedValue(createMockCharacter(20, 50, 5, 10, []))
      await expect(combatService.useConsumable('user-1', 'health_potion')).rejects.toThrow(
        RESOURCE_NOT_FOUND_OR_FORBIDDEN
      )
    })

    it('throws if consumable definition does not exist', async () => {
      await expect(combatService.useConsumable('user-1', 'invalid_potion')).rejects.toThrow(
        RESOURCE_NOT_FOUND_OR_FORBIDDEN
      )
    })

    it('blocks a second potion in the same turn when markPotionTurn is set', async () => {
      const inventory = [{ id: 'item-1', type: ItemType.CONSUMABLE, definitionId: 'health_potion' }]
      mockCharacterRepo.findWithClassesOrThrow.mockResolvedValue(createMockCharacter(20, 50, 5, 10, inventory))
      mockCharacterQuestRepo.findActiveByCharacterId.mockResolvedValue({
        id: 'quest-1',
        tacticalState: { ...createTacticalStateForConsumable(20, 50), potionUsedThisTurn: true }
      })

      await expect(combatService.useConsumable('user-1', 'health_potion', { markPotionTurn: true })).rejects.toThrow(
        'Already used a potion this turn'
      )
    })
  })

  describe('playerExecuteMove (turn pointer recovery)', () => {
    const stuckState: TacticalStateData = {
      units: [
        {
          id: 'player-1',
          name: 'Player',
          currentHealth: 40,
          maxHealth: 40,
          currentMana: 2,
          maxMana: 5,
          speed: 1,
          strengthAtk: 4,
          strengthDef: 4,
          magicAtk: 5,
          magicDef: 5
        },
        {
          id: 'enemy-spawn-1',
          name: 'Shadow Demon',
          templateId: 'shadow_demon',
          currentHealth: 14,
          maxHealth: 30,
          currentMana: 5,
          maxMana: 5,
          speed: 1,
          strengthAtk: 5,
          strengthDef: 4,
          magicAtk: 3,
          magicDef: 3,
          moves: ['basic_strike']
        }
      ],
      turnOrder: ['player-1', 'enemy-spawn-1'],
      currentTurnIndex: 1
    }

    const mkEnemyResult = (overrides: Partial<TacticalMoveResult> = {}): TacticalMoveResult => ({
      success: true as const,
      casterId: 'enemy-spawn-1',
      moveId: 'basic_strike',
      targeting: 'single',
      affectedUnitIds: ['player-1'],
      effects: [{ unitId: 'player-1', damageDealt: 4 }],
      manaCost: 0,
      updatedState: {
        ...stuckState,
        units: stuckState.units.map((u) => (u.id === 'player-1' ? { ...u, currentHealth: 36 } : u)),
        currentTurnIndex: 0
      },
      logEntries: [],
      newMana: 5,
      ...overrides
    })

    const mkPlayerResult = (): TacticalMoveResult => ({
      success: true as const,
      casterId: 'player-1',
      moveId: 'basic_strike',
      targeting: 'single',
      affectedUnitIds: ['enemy-spawn-1'],
      effects: [{ unitId: 'enemy-spawn-1', damageDealt: 10 }],
      manaCost: 0,
      updatedState: stuckState,
      logEntries: [],
      newMana: 2
    })

    beforeEach(() => {
      executeMoveMock.mockReset()
      executeEnemyMoveMock.mockReset()
      mockCharacterQuestRepo.findByIdWithTacticalState.mockResolvedValue({
        id: 'quest-1',
        characterId: 'char-1',
        tacticalState: stuckState
      })
      mockCharacterService.getCurrentClass.mockResolvedValue({
        id: 'char-1',
        currentClass: 'templar',
        classes: [
          {
            id: 'class-1',
            className: 'templar',
            health: 40,
            maxHealth: 40,
            mana: 2,
            maxMana: 5,
            tier: 1,
            strengthAtk: 4,
            strengthDef: 4,
            magicAtk: 5,
            magicDef: 5,
            speed: 1,
            manaRegen: 1,
            equippedAbilities: ['truth_blade']
          }
        ]
      })
    })

    it('auto-runs the pending enemy turn when player calls executeMove on the enemy pointer', async () => {
      executeEnemyMoveMock.mockResolvedValue(mkEnemyResult())
      executeMoveMock.mockResolvedValue(mkPlayerResult())

      const result = await combatService.playerExecuteMove('user-1', 'qstpub000001', 'player-1', 'basic_strike', [
        'enemy-spawn-1'
      ])

      expect(executeEnemyMoveMock).toHaveBeenCalledTimes(1)
      expect(executeEnemyMoveMock.mock.calls[0][0]).toMatchObject({
        participationId: BigInt(1),
        enemyId: 'enemy-spawn-1'
      })
      expect(executeMoveMock).toHaveBeenCalledTimes(1)
      expect(executeMoveMock.mock.calls[0][0]).toMatchObject({
        participationId: BigInt(1),
        casterId: 'player-1',
        moveId: 'basic_strike'
      })
      expect(result.casterId).toBe('player-1')
    })

    it('short-circuits with the enemy result when the auto-run kills the player', async () => {
      const lethal = mkEnemyResult({
        updatedState: {
          ...stuckState,
          units: stuckState.units.map((u) => (u.id === 'player-1' ? { ...u, currentHealth: 0 } : u))
        }
      })
      executeEnemyMoveMock.mockResolvedValue(lethal)

      const result = await combatService.playerExecuteMove('user-1', 'qstpub000001', 'player-1', 'basic_strike', [
        'enemy-spawn-1'
      ])

      expect(executeEnemyMoveMock).toHaveBeenCalledTimes(1)
      expect(executeMoveMock).not.toHaveBeenCalled()
      expect(result).toBe(lethal)
    })

    it('skips recovery when turn pointer is already on the player', async () => {
      mockCharacterQuestRepo.findByIdWithTacticalState.mockResolvedValue({
        id: 'quest-1',
        characterId: 'char-1',
        tacticalState: { ...stuckState, currentTurnIndex: 0 }
      })
      executeMoveMock.mockResolvedValue(mkPlayerResult())

      await combatService.playerExecuteMove('user-1', 'qstpub000001', 'player-1', 'basic_strike', ['enemy-spawn-1'])

      expect(executeEnemyMoveMock).not.toHaveBeenCalled()
      expect(executeMoveMock).toHaveBeenCalledTimes(1)
    })

    it('skips recovery when the pending unit is already dead', async () => {
      mockCharacterQuestRepo.findByIdWithTacticalState.mockResolvedValue({
        id: 'quest-1',
        characterId: 'char-1',
        tacticalState: {
          ...stuckState,
          units: stuckState.units.map((u) => (u.id === 'enemy-spawn-1' ? { ...u, currentHealth: 0 } : u))
        }
      })
      executeMoveMock.mockResolvedValue(mkPlayerResult())

      await combatService.playerExecuteMove('user-1', 'qstpub000001', 'player-1', 'basic_strike', ['enemy-spawn-1'])

      expect(executeEnemyMoveMock).not.toHaveBeenCalled()
      expect(executeMoveMock).toHaveBeenCalledTimes(1)
    })
  })

  describe('player entry points (validation)', () => {
    it('playerExecuteMove throws NOT_FOUND if user does not own the quest', async () => {
      mockCharacterQuestRepo.verifyOwnership.mockResolvedValue(false)
      await expect(
        combatService.playerExecuteMove('user-1', 'qstpub000001', 'player-1', 'basic_strike', ['enemy-1'])
      ).rejects.toThrow(RESOURCE_NOT_FOUND_OR_FORBIDDEN)
    })

    it('playerExecuteMove throws FORBIDDEN if casterId is not a player unit', async () => {
      mockCharacterQuestRepo.verifyOwnership.mockResolvedValue(true)
      await expect(
        combatService.playerExecuteMove('user-1', 'qstpub000001', 'enemy-1', 'basic_strike', ['enemy-2'])
      ).rejects.toThrow('Cannot execute move for enemy units')
    })

    it('playerEnemyTurn throws NOT_FOUND if user does not own the quest', async () => {
      mockCharacterQuestRepo.verifyOwnership.mockResolvedValue(false)
      await expect(combatService.playerEnemyTurn('user-1', 'qstpub000001', 'enemy-1')).rejects.toThrow(
        RESOURCE_NOT_FOUND_OR_FORBIDDEN
      )
    })

    it('playerEnemyTurn throws BAD_REQUEST if enemyId is a player unit', async () => {
      mockCharacterQuestRepo.verifyOwnership.mockResolvedValue(true)
      await expect(combatService.playerEnemyTurn('user-1', 'qstpub000001', 'player-1')).rejects.toThrow(
        'Cannot execute AI turn for player units'
      )
    })

    it('playerUsePotion throws NOT_FOUND if user does not own the quest', async () => {
      mockCharacterQuestRepo.verifyOwnership.mockResolvedValue(false)
      await expect(combatService.playerUsePotion('user-1', 'qstpub000001', 'health_potion')).rejects.toThrow(
        RESOURCE_NOT_FOUND_OR_FORBIDDEN
      )
    })
  })
})
