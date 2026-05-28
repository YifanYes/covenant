import { TRPCError } from '@trpc/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AreaRepository } from '../../repositories/area.repository'
import type { CharacterRepository } from '../../repositories/character.repository'
import type { ObjectiveRepository } from '../../repositories/objective.repository'
import type { UserRepository } from '../../repositories/user.repository'
import { AreaService } from '../../services/area.service'
import { CharacterService } from '../../services/character.service'
import type { ManaService } from '../../services/mana.service'
import { ObjectiveService } from '../../services/objective.service'
import { createRepoMock } from '../helpers/mock-repo'

describe('Authorization - Service Layer', () => {
  describe('AreaService', () => {
    let areaService: AreaService
    let mockAreaRepo: ReturnType<typeof createRepoMock<AreaRepository>>

    beforeEach(() => {
      vi.clearAllMocks()

      mockAreaRepo = createRepoMock<AreaRepository>()

      areaService = new AreaService(mockAreaRepo)
    })

    describe('update', () => {
      it('should resolve publicId then pass userId to repo for authorization', async () => {
        const userId = 'user-1'
        const input = { publicId: 'pubid1234567', name: 'Updated Name' }
        const existingArea = { id: BigInt(1), publicId: 'pubid1234567', userId, name: 'Old Name' }
        const updatedArea = { id: BigInt(1), publicId: 'pubid1234567', userId, name: 'Updated Name' }

        mockAreaRepo.findByPublicId.mockResolvedValue(existingArea)
        mockAreaRepo.update.mockResolvedValue(updatedArea)

        await areaService.update(userId, input)

        expect(mockAreaRepo.findByPublicId).toHaveBeenCalledWith('pubid1234567', userId)
        expect(mockAreaRepo.update).toHaveBeenCalledWith(BigInt(1), userId, input)
      })

      it('should throw NOT_FOUND when publicId resolves nothing', async () => {
        const userId = 'user-1'
        const input = { publicId: 'missingxxxxx', name: 'Updated Name' }

        mockAreaRepo.findByPublicId.mockResolvedValue(null)

        await expect(areaService.update(userId, input)).rejects.toMatchObject({
          code: 'NOT_FOUND'
        })
        expect(mockAreaRepo.update).not.toHaveBeenCalled()
      })
    })

    describe('delete', () => {
      it('should resolve publicId then pass userId to repo for authorization', async () => {
        const userId = 'user-1'
        const publicId = 'pubid1234567'
        const existingArea = { id: BigInt(1), publicId, userId, name: 'Test Area' }

        mockAreaRepo.findByPublicId.mockResolvedValue(existingArea)
        mockAreaRepo.delete.mockResolvedValue(existingArea)

        await areaService.delete(userId, publicId)

        expect(mockAreaRepo.findByPublicId).toHaveBeenCalledWith(publicId, userId)
        expect(mockAreaRepo.delete).toHaveBeenCalledWith(BigInt(1), userId)
      })

      it('should throw NOT_FOUND when publicId resolves nothing', async () => {
        const userId = 'user-1'
        mockAreaRepo.findByPublicId.mockResolvedValue(null)

        await expect(areaService.delete(userId, 'missingxxxxx')).rejects.toMatchObject({
          code: 'NOT_FOUND'
        })
        expect(mockAreaRepo.delete).not.toHaveBeenCalled()
      })
    })
  })

  describe('ObjectiveService', () => {
    let objectiveService: ObjectiveService
    let mockObjectiveRepo: ReturnType<typeof createRepoMock<ObjectiveRepository>>
    let mockManaService: ReturnType<typeof createRepoMock<ManaService>>

    beforeEach(() => {
      vi.clearAllMocks()

      mockObjectiveRepo = createRepoMock<ObjectiveRepository>()

      mockManaService = createRepoMock<ManaService>()
      mockManaService.addManaFromCompletion.mockResolvedValue({
        success: true,
        amount: 10,
        manaApplied: 10,
        reserveGained: 0,
        newMana: 10,
        newReserve: 0
      })

      objectiveService = new ObjectiveService(mockObjectiveRepo, mockManaService)
    })

    describe('update', () => {
      it('resolves publicId then calls repo.update', async () => {
        const userId = 'user-1'
        const input = { publicId: 'objpub000010', name: 'Updated Name' }
        const existing = { id: BigInt(10), publicId: 'objpub000010', userId }
        const updatedObjective = { id: BigInt(10), publicId: 'objpub000010', userId, name: 'Updated Name' }

        mockObjectiveRepo.findByPublicId.mockResolvedValue(existing)
        mockObjectiveRepo.update.mockResolvedValue(updatedObjective)

        await objectiveService.update(userId, input)

        expect(mockObjectiveRepo.findByPublicId).toHaveBeenCalledWith('objpub000010', userId)
        expect(mockObjectiveRepo.update).toHaveBeenCalledWith(BigInt(10), userId, input)
      })
    })

    describe('complete', () => {
      it('resolves publicId then calls repo.complete', async () => {
        const userId = 'user-1'
        const existing = { id: BigInt(10), publicId: 'objpub000010', userId }
        const completedObjective = { id: BigInt(10), publicId: 'objpub000010', userId, completedAt: new Date() }

        mockObjectiveRepo.findByPublicId.mockResolvedValue(existing)
        mockObjectiveRepo.complete.mockResolvedValue(completedObjective)

        await objectiveService.complete(userId, 'objpub000010')

        expect(mockObjectiveRepo.complete).toHaveBeenCalledWith(BigInt(10), userId)
      })
    })

    describe('delete', () => {
      it('resolves publicId then calls repo.delete', async () => {
        const userId = 'user-1'
        const existing = { id: BigInt(10), publicId: 'objpub000010', userId }

        mockObjectiveRepo.findByPublicId.mockResolvedValue(existing)
        mockObjectiveRepo.delete.mockResolvedValue({ id: BigInt(10), publicId: 'objpub000010', userId })

        await objectiveService.delete(userId, 'objpub000010')

        expect(mockObjectiveRepo.delete).toHaveBeenCalledWith(BigInt(10), userId)
      })
    })
  })

  describe('CharacterService', () => {
    let characterService: CharacterService
    let mockCharacterRepo: ReturnType<typeof createRepoMock<CharacterRepository>>

    beforeEach(() => {
      vi.clearAllMocks()

      mockCharacterRepo = createRepoMock<CharacterRepository>()

      characterService = new CharacterService(mockCharacterRepo, createRepoMock<UserRepository>())
    })

    describe('getCharacterById', () => {
      it('should pass userId to repository for authorization when provided', async () => {
        const characterId = BigInt(100)
        const userId = 'user-1'
        const character = { id: characterId, userId, name: 'Test Character', classes: [] }

        mockCharacterRepo.findByIdWithClassesOrThrow.mockResolvedValue(character)

        await characterService.getCharacterById(characterId, userId)

        expect(mockCharacterRepo.findByIdWithClassesOrThrow).toHaveBeenCalledWith(characterId, userId)
      })

      it('should not require userId for public lookups', async () => {
        const characterId = BigInt(100)
        const character = { id: characterId, userId: 'user-1', name: 'Test Character', classes: [] }

        mockCharacterRepo.findByIdWithClassesOrThrow.mockResolvedValue(character)

        await characterService.getCharacterById(characterId)

        expect(mockCharacterRepo.findByIdWithClassesOrThrow).toHaveBeenCalledWith(characterId, undefined)
      })
    })

    describe('verifyCharacterOwnership', () => {
      it('should return true when user owns character', async () => {
        const characterId = BigInt(100)
        const userId = 'user-1'

        mockCharacterRepo.verifyOwnership.mockResolvedValue(true)

        const result = await characterService.verifyCharacterOwnership(characterId, userId)

        expect(result).toBe(true)
        expect(mockCharacterRepo.verifyOwnership).toHaveBeenCalledWith(characterId, userId)
      })

      it('should return false when user does not own character', async () => {
        const characterId = BigInt(100)
        const userId = 'user-1'

        mockCharacterRepo.verifyOwnership.mockResolvedValue(false)

        const result = await characterService.verifyCharacterOwnership(characterId, userId)

        expect(result).toBe(false)
      })
    })
  })
})
