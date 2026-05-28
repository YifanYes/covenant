import { TRPCError } from '@trpc/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RESOURCE_NOT_FOUND_OR_FORBIDDEN } from '../../lib/errors'
import type { CharacterQuestRepository } from '../../repositories/character-quest.repository'
import type { CharacterRepository } from '../../repositories/character.repository'
import type { CombatEnemyRepository } from '../../repositories/combat-enemy.repository'
import type { CharacterService } from '../../services/character.service'
import type { ManaService } from '../../services/mana.service'
import { QuestService } from '../../services/quest.service'
import { mockCharacter } from '../fixtures/character.fixtures'
import { mockCharacterQuest } from '../fixtures/quest.fixtures'
import { createRepoMock } from '../helpers/mock-repo'

const CHAR_SLUG = 'test-character'
const QUEST_PUB = 'questpub00001'

describe('QuestService', () => {
  let questService: QuestService
  let mockCharacterQuestRepo: ReturnType<typeof createRepoMock<CharacterQuestRepository>>
  let mockCombatEnemyRepo: ReturnType<typeof createRepoMock<CombatEnemyRepository>>
  let mockCharacterService: ReturnType<typeof createRepoMock<CharacterService>>
  let mockCharacterRepo: ReturnType<typeof createRepoMock<CharacterRepository>>

  beforeEach(() => {
    vi.clearAllMocks()

    mockCharacterQuestRepo = createRepoMock<CharacterQuestRepository>()
    mockCharacterQuestRepo.verifyOwnership.mockResolvedValue(true)
    mockCharacterQuestRepo.findByPublicId.mockResolvedValue({ id: BigInt(1), publicId: QUEST_PUB })

    mockCombatEnemyRepo = createRepoMock<CombatEnemyRepository>()

    mockCharacterService = createRepoMock<CharacterService>()
    mockCharacterService.verifyCharacterOwnership.mockResolvedValue(true)

    mockCharacterRepo = createRepoMock<CharacterRepository>()
    mockCharacterRepo.findBySlug.mockResolvedValue({ id: BigInt(123), slug: CHAR_SLUG, userId: 'user-123' })

    const mockManaService = createRepoMock<ManaService>()
    mockManaService.topUpFromReserve.mockResolvedValue({ added: 0, newMana: 0, newReserve: 0 })

    questService = new QuestService(
      mockCharacterQuestRepo,
      mockCombatEnemyRepo,
      mockCharacterService,
      mockManaService,
      mockCharacterRepo
    )
  })

  describe('startQuest', () => {
    it('creates a CharacterQuest with ACTIVE status and target from template', async () => {
      const character = mockCharacter({
        classes: [{ id: 'class-1', className: 'TEMPLAR', tier: 1, health: 10, maxHealth: 10, mana: 5, maxMana: 5 }]
      })
      const quest = mockCharacterQuest({ id: BigInt(2), publicId: QUEST_PUB })

      mockCharacterQuestRepo.findActiveByCharacterId.mockResolvedValue(null)
      mockCharacterService.getCharacterById.mockResolvedValue(character)
      mockCharacterQuestRepo.create.mockResolvedValue(quest)
      mockCombatEnemyRepo.createEnemy.mockResolvedValue({
        id: BigInt(101),
        publicId: 'enpub0000001',
        templateId: 'shadow_demon',
        namePrefix: 'prefix',
        nameSuffix: 'suffix',
        currentHealth: 10,
        maxHealth: 10
      })
      mockCharacterQuestRepo.updateTacticalState.mockResolvedValue(undefined)

      const result = await questService.startQuest('patrol_north_gate', CHAR_SLUG, 'user-123')

      expect(mockCharacterRepo.findBySlug).toHaveBeenCalledWith('user-123', CHAR_SLUG)
      expect(mockCharacterService.verifyCharacterOwnership).toHaveBeenCalledWith(BigInt(123), 'user-123')
      expect(mockCharacterQuestRepo.create).toHaveBeenCalledWith(BigInt(123), 'patrol_north_gate', 5)
      expect(result.quest.status).toBe('ACTIVE')
      expect(result.activeEnemy).toBeDefined()
    })

    it('throws NOT_FOUND if character slug not resolved', async () => {
      mockCharacterRepo.findBySlug.mockResolvedValue(null)

      await expect(questService.startQuest('patrol_north_gate', CHAR_SLUG, 'other-user')).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: RESOURCE_NOT_FOUND_OR_FORBIDDEN
      })
    })

    it('throws BAD_REQUEST if character already has an active quest', async () => {
      mockCharacterQuestRepo.findActiveByCharacterId.mockResolvedValue(mockCharacterQuest())

      await expect(questService.startQuest('patrol_north_gate', CHAR_SLUG, 'user-123')).rejects.toThrow(TRPCError)
    })

    it('throws NOT_FOUND if questId does not exist in constants', async () => {
      mockCharacterQuestRepo.findActiveByCharacterId.mockResolvedValue(null)

      await expect(questService.startQuest('nonexistent_quest', CHAR_SLUG, 'user-123')).rejects.toThrow(TRPCError)
    })
  })

  describe('getActiveQuest', () => {
    it('returns null when no active quest', async () => {
      mockCharacterQuestRepo.findActiveByCharacterId.mockResolvedValue(null)

      const result = await questService.getActiveQuest(CHAR_SLUG, 'user-123')
      expect(result).toBeNull()
    })

    it('throws NOT_FOUND if character slug not resolved', async () => {
      mockCharacterRepo.findBySlug.mockResolvedValue(null)

      await expect(questService.getActiveQuest(CHAR_SLUG, 'other-user')).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: RESOURCE_NOT_FOUND_OR_FORBIDDEN
      })
    })

    it('returns quest with active enemy data', async () => {
      const quest = mockCharacterQuest()
      const enemy = {
        publicId: 'enpub0000001',
        templateId: 'shadow_demon',
        namePrefix: 'the_dark',
        nameSuffix: 'destroyer',
        currentHealth: 8,
        maxHealth: 10
      }

      mockCharacterQuestRepo.findActiveByCharacterId.mockResolvedValue(quest)
      mockCharacterQuestRepo.findById.mockResolvedValue({ ...quest, publicId: QUEST_PUB })
      mockCombatEnemyRepo.getActiveEnemy.mockResolvedValue(enemy)

      const result = await questService.getActiveQuest(CHAR_SLUG, 'user-123')

      expect(result).not.toBeNull()
      expect(result!.publicId).toBe(QUEST_PUB)
      expect(result!.activeEnemy?.publicId).toBe('enpub0000001')
    })
  })

  describe('abandonQuest', () => {
    it('sets status to ABANDONED', async () => {
      mockCharacterQuestRepo.verifyOwnership.mockResolvedValue(true)
      mockCharacterQuestRepo.abandon.mockResolvedValue(undefined)

      await questService.abandonQuest(QUEST_PUB, 'user-123')

      expect(mockCharacterQuestRepo.abandon).toHaveBeenCalledWith(BigInt(1))
    })

    it('throws NOT_FOUND if user does not own the quest', async () => {
      mockCharacterQuestRepo.verifyOwnership.mockResolvedValue(false)

      await expect(questService.abandonQuest(QUEST_PUB, 'other-user')).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: RESOURCE_NOT_FOUND_OR_FORBIDDEN
      })
    })
  })

  describe('getAvailableQuests', () => {
    it('returns all quest templates', async () => {
      mockCharacterQuestRepo.findActiveByCharacterId.mockResolvedValue(null)

      const result = await questService.getAvailableQuests('user-123', CHAR_SLUG)

      expect(result.length).toBeGreaterThan(0)
      expect(result[0]).toHaveProperty('id')
      expect(result[0]).toHaveProperty('difficulty')
    })

    it('marks the active quest template as isActive', async () => {
      mockCharacterQuestRepo.findActiveByCharacterId.mockResolvedValue(
        mockCharacterQuest({ questId: 'patrol_north_gate' })
      )
      mockCharacterQuestRepo.findById.mockResolvedValue({ id: BigInt(1), publicId: QUEST_PUB })

      const result = await questService.getAvailableQuests('user-123', CHAR_SLUG)
      const active = result.find((q) => q.id === 'patrol_north_gate')

      expect(active?.isActive).toBe(true)
    })

    it('throws NOT_FOUND if character slug not resolved', async () => {
      mockCharacterRepo.findBySlug.mockResolvedValue(null)

      await expect(questService.getAvailableQuests('other-user', CHAR_SLUG)).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: RESOURCE_NOT_FOUND_OR_FORBIDDEN
      })
    })

    it('works without a characterSlug (no active quest lookup)', async () => {
      const result = await questService.getAvailableQuests('user-123')
      expect(result.length).toBeGreaterThan(0)
      result.forEach((q) => expect(q.isActive).toBe(false))
    })
  })

  describe('getTacticalState', () => {
    const fullUnit = (over: Partial<Record<string, unknown>> & { id: string }) => ({
      name: over.id,
      currentHealth: 40,
      maxHealth: 40,
      currentMana: 5,
      maxMana: 5,
      speed: 1,
      strengthAtk: 4,
      strengthDef: 4,
      magicAtk: 5,
      magicDef: 5,
      ...over
    })

    it('returns the tactical state for a quest', async () => {
      const tacticalState = {
        units: [fullUnit({ id: 'player-1' }), fullUnit({ id: 'enemy-1', templateId: 'shadow_demon' })],
        turnOrder: ['player-1', 'enemy-1'],
        currentTurnIndex: 0
      }
      mockCharacterQuestRepo.findByIdWithTacticalState.mockResolvedValue({
        id: BigInt(1),
        characterId: BigInt(123),
        tacticalState
      })
      mockCharacterService.getCharacterById.mockResolvedValue(
        mockCharacter({
          currentClass: 'TEMPLAR',
          classes: [{ id: 'class-1', className: 'TEMPLAR', tier: 1, health: 40, maxHealth: 40, mana: 5, maxMana: 5 }]
        })
      )

      const result = await questService.getTacticalState(QUEST_PUB, 'user-123')
      expect(result?.turnOrder).toEqual(['player-1', 'enemy-1'])
      expect(result?.units).toHaveLength(2)
    })

    it('returns null if quest not found', async () => {
      mockCharacterQuestRepo.findByIdWithTacticalState.mockResolvedValue(null)

      const result = await questService.getTacticalState(QUEST_PUB, 'user-123')
      expect(result).toBeNull()
    })

    it('returns null when repo surfaces null tacticalState (parse failed at boundary)', async () => {
      mockCharacterQuestRepo.findByIdWithTacticalState.mockResolvedValue({
        id: BigInt(1),
        characterId: BigInt(123),
        tacticalState: null
      })

      const result = await questService.getTacticalState(QUEST_PUB, 'user-123')
      expect(result).toBeNull()
    })

    it('reconciles stale player HP/MP caps against the live character class', async () => {
      const staleState = {
        units: [
          fullUnit({ id: 'player-1', currentHealth: 0, maxHealth: 8, currentMana: 2, maxMana: 3 }),
          fullUnit({ id: 'enemy-1', currentHealth: 5, maxHealth: 10, templateId: 'shadow_demon' })
        ],
        turnOrder: ['player-1', 'enemy-1'],
        currentTurnIndex: 0
      }
      mockCharacterQuestRepo.findByIdWithTacticalState.mockResolvedValue({
        id: BigInt(1),
        characterId: BigInt(123),
        tacticalState: staleState
      })
      mockCharacterService.getCharacterById.mockResolvedValue(
        mockCharacter({
          currentClass: 'TEMPLAR',
          classes: [{ id: 'class-1', className: 'TEMPLAR', tier: 1, health: 40, maxHealth: 40, mana: 5, maxMana: 5 }]
        })
      )

      const result = await questService.getTacticalState(QUEST_PUB, 'user-123')
      const player = result!.units.find((u) => u.id === 'player-1')!
      expect(player.maxHealth).toBe(40)
      expect(player.currentHealth).toBe(40)
      expect(player.maxMana).toBe(5)
      expect(player.currentMana).toBe(5)

      const enemy = result!.units.find((u) => u.id === 'enemy-1')!
      expect(enemy.maxHealth).toBe(10)
      expect(enemy.currentHealth).toBe(5)
      expect(enemy.templateId).toBe('shadow_demon')
    })

    it('throws NOT_FOUND if user does not own the quest', async () => {
      mockCharacterQuestRepo.verifyOwnership.mockResolvedValue(false)

      await expect(questService.getTacticalState(QUEST_PUB, 'other-user')).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: RESOURCE_NOT_FOUND_OR_FORBIDDEN
      })
    })
  })
})
