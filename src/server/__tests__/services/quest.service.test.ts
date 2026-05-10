import { TRPCError } from '@trpc/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RESOURCE_NOT_FOUND_OR_FORBIDDEN } from '../../lib/errors'
import { QuestService } from '../../services/quest.service'
import { mockCharacter } from '../fixtures/character.fixtures'
import { mockCharacterQuest } from '../fixtures/quest.fixtures'

describe('QuestService', () => {
  let questService: QuestService
  let mockCharacterQuestRepo: any
  let mockCombatEnemyRepo: any
  let mockCharacterService: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockCharacterQuestRepo = {
      findById: vi.fn(),
      findActiveByCharacterId: vi.fn(),
      findByIdWithTacticalState: vi.fn(),
      findByIdWithDoctrines: vi.fn(),
      create: vi.fn(),
      updateProgress: vi.fn(),
      complete: vi.fn(),
      abandon: vi.fn(),
      updateTacticalState: vi.fn(),
      updateDoctrines: vi.fn(),
      updateActiveDoctrines: vi.fn(),
      updateCombatStats: vi.fn(),
      getCombatStats: vi.fn(),
      verifyOwnership: vi.fn().mockResolvedValue(true)
    }

    mockCombatEnemyRepo = {
      getActiveEnemy: vi.fn(),
      createEnemy: vi.fn(),
      defeatEnemy: vi.fn()
    }

    mockCharacterService = {
      getCharacterById: vi.fn(),
      getCurrentClass: vi.fn(),
      verifyCharacterOwnership: vi.fn().mockResolvedValue(true)
    }

    questService = new QuestService(mockCharacterQuestRepo, mockCombatEnemyRepo, mockCharacterService)
  })

  describe('startQuest', () => {
    it('creates a CharacterQuest with ACTIVE status and target from template', async () => {
      const character = mockCharacter({
        classes: [{ id: 'class-1', className: 'TEMPLAR', tier: 1, health: 10, maxHealth: 10, mana: 5, maxMana: 5 }]
      })
      const quest = mockCharacterQuest({ id: 'new-quest-id' })

      mockCharacterQuestRepo.findActiveByCharacterId.mockResolvedValue(null)
      mockCharacterService.getCharacterById.mockResolvedValue(character)
      mockCharacterQuestRepo.create.mockResolvedValue(quest)
      mockCombatEnemyRepo.createEnemy.mockResolvedValue({
        id: 'enemy-1',
        templateId: 'shadow_demon',
        namePrefix: 'prefix',
        nameSuffix: 'suffix',
        currentHealth: 10,
        maxHealth: 10
      })
      mockCharacterQuestRepo.updateTacticalState.mockResolvedValue(undefined)

      const result = await questService.startQuest('patrol_north_gate', 'char-123', 'user-123')

      expect(mockCharacterService.verifyCharacterOwnership).toHaveBeenCalledWith('char-123', 'user-123')
      expect(mockCharacterQuestRepo.create).toHaveBeenCalledWith('char-123', 'patrol_north_gate', 5)
      expect(result.quest.status).toBe('ACTIVE')
      expect(result.activeEnemy).toBeDefined()
    })

    it('throws NOT_FOUND if user does not own the character', async () => {
      mockCharacterService.verifyCharacterOwnership.mockResolvedValue(false)

      await expect(questService.startQuest('patrol_north_gate', 'char-123', 'other-user')).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: RESOURCE_NOT_FOUND_OR_FORBIDDEN
      })
    })

    it('throws BAD_REQUEST if character already has an active quest', async () => {
      mockCharacterQuestRepo.findActiveByCharacterId.mockResolvedValue(mockCharacterQuest())

      await expect(questService.startQuest('patrol_north_gate', 'char-123', 'user-123')).rejects.toThrow(TRPCError)
    })

    it('throws NOT_FOUND if questId does not exist in constants', async () => {
      mockCharacterQuestRepo.findActiveByCharacterId.mockResolvedValue(null)

      await expect(questService.startQuest('nonexistent_quest', 'char-123', 'user-123')).rejects.toThrow(TRPCError)
    })

    it('spawns an initial enemy and saves tactical state', async () => {
      const character = mockCharacter({
        id: 'char-123',
        name: 'Test Character',
        currentClass: 'TEMPLAR',
        classes: [
          { id: 'class-1', className: 'TEMPLAR', tier: 1, health: 10, maxHealth: 10, mana: 5, maxMana: 5 }
        ]
      })
      const quest = mockCharacterQuest({ id: 'new-quest-id' })

      mockCharacterQuestRepo.findActiveByCharacterId.mockResolvedValue(null)
      mockCharacterService.getCharacterById.mockResolvedValue(character)
      mockCharacterQuestRepo.create.mockResolvedValue(quest)
      mockCombatEnemyRepo.createEnemy.mockResolvedValue({
        id: 'enemy-1',
        templateId: 'shadow_demon',
        namePrefix: 'the_dark',
        nameSuffix: 'destroyer',
        currentHealth: 10,
        maxHealth: 10
      })
      mockCharacterQuestRepo.updateTacticalState.mockResolvedValue(undefined)

      await questService.startQuest('patrol_north_gate', 'char-123', 'user-123')

      expect(mockCombatEnemyRepo.createEnemy).toHaveBeenCalledWith(
        expect.objectContaining({
          characterQuestId: 'new-quest-id'
        })
      )
      expect(mockCharacterQuestRepo.updateTacticalState).toHaveBeenCalledWith(
        'new-quest-id',
        expect.objectContaining({ stateVersion: 2 })
      )
    })
  })

  describe('getActiveQuest', () => {
    it('returns null when no active quest', async () => {
      mockCharacterQuestRepo.findActiveByCharacterId.mockResolvedValue(null)

      const result = await questService.getActiveQuest('char-123', 'user-123')
      expect(result).toBeNull()
    })

    it('throws NOT_FOUND if user does not own the character', async () => {
      mockCharacterService.verifyCharacterOwnership.mockResolvedValue(false)

      await expect(questService.getActiveQuest('char-123', 'other-user')).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: RESOURCE_NOT_FOUND_OR_FORBIDDEN
      })
    })

    it('returns quest with active enemy data', async () => {
      const quest = mockCharacterQuest()
      const enemy = {
        id: 'enemy-1',
        templateId: 'shadow_demon',
        namePrefix: 'the_dark',
        nameSuffix: 'destroyer',
        currentHealth: 8,
        maxHealth: 10
      }

      mockCharacterQuestRepo.findActiveByCharacterId.mockResolvedValue(quest)
      mockCharacterQuestRepo.findById.mockResolvedValue(quest)
      mockCombatEnemyRepo.getActiveEnemy.mockResolvedValue(enemy)

      const result = await questService.getActiveQuest('char-123', 'user-123')

      expect(result).not.toBeNull()
      expect(result!.id).toBe('quest-instance-1')
      expect(result!.activeEnemy?.id).toBe('enemy-1')
    })
  })

  describe('abandonQuest', () => {
    it('sets status to ABANDONED', async () => {
      mockCharacterQuestRepo.verifyOwnership.mockResolvedValue(true)
      mockCharacterQuestRepo.abandon.mockResolvedValue(undefined)

      await questService.abandonQuest('quest-instance-1', 'user-123')

      expect(mockCharacterQuestRepo.abandon).toHaveBeenCalledWith('quest-instance-1')
    })

    it('throws NOT_FOUND if user does not own the quest', async () => {
      mockCharacterQuestRepo.verifyOwnership.mockResolvedValue(false)

      await expect(questService.abandonQuest('quest-instance-1', 'other-user')).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: RESOURCE_NOT_FOUND_OR_FORBIDDEN
      })
    })
  })

  describe('getAvailableQuests', () => {
    it('returns all quest templates', async () => {
      mockCharacterQuestRepo.findActiveByCharacterId.mockResolvedValue(null)

      const result = await questService.getAvailableQuests('user-123', 'char-123')

      expect(result.length).toBeGreaterThan(0)
      expect(result[0]).toHaveProperty('id')
      expect(result[0]).toHaveProperty('difficulty')
    })

    it('marks the active quest template as isActive', async () => {
      mockCharacterQuestRepo.findActiveByCharacterId.mockResolvedValue(
        mockCharacterQuest({ questId: 'patrol_north_gate' })
      )

      const result = await questService.getAvailableQuests('user-123', 'char-123')
      const active = result.find((q) => q.id === 'patrol_north_gate')

      expect(active?.isActive).toBe(true)
    })

    it('throws NOT_FOUND if user does not own the character', async () => {
      mockCharacterService.verifyCharacterOwnership.mockResolvedValue(false)

      await expect(questService.getAvailableQuests('other-user', 'char-123')).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: RESOURCE_NOT_FOUND_OR_FORBIDDEN
      })
    })

    it('works without a characterId (no active quest lookup)', async () => {
      const result = await questService.getAvailableQuests('user-123')
      expect(result.length).toBeGreaterThan(0)
      result.forEach((q) => expect(q.isActive).toBe(false))
    })
  })

  describe('getTacticalState', () => {
    it('returns the tactical state for a quest', async () => {
      const tacticalState = { stateVersion: 2, units: [] }
      mockCharacterQuestRepo.findByIdWithTacticalState.mockResolvedValue({
        id: 'quest-instance-1',
        characterId: 'char-123',
        tacticalState
      })

      const result = await questService.getTacticalState('quest-instance-1', 'user-123')
      expect(result).toEqual(tacticalState)
    })

    it('returns null if quest not found', async () => {
      mockCharacterQuestRepo.findByIdWithTacticalState.mockResolvedValue(null)

      const result = await questService.getTacticalState('nonexistent', 'user-123')
      expect(result).toBeNull()
    })

    it('returns null if state version mismatches', async () => {
      mockCharacterQuestRepo.findByIdWithTacticalState.mockResolvedValue({
        id: 'quest-instance-1',
        characterId: 'char-123',
        tacticalState: { stateVersion: 1, units: [] }
      })

      const result = await questService.getTacticalState('quest-instance-1', 'user-123')
      expect(result).toBeNull()
    })

    it('throws NOT_FOUND if user does not own the quest', async () => {
      mockCharacterQuestRepo.verifyOwnership.mockResolvedValue(false)

      await expect(questService.getTacticalState('quest-instance-1', 'other-user')).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: RESOURCE_NOT_FOUND_OR_FORBIDDEN
      })
    })
  })
})
