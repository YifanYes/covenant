import { TRPCError } from '@trpc/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AreaService } from '../../services/area.service'
import { CharacterService } from '../../services/character.service'
import { ObjectiveService } from '../../services/objective.service'

describe('Authorization - Service Layer', () => {
  describe('AreaService', () => {
    let areaService: AreaService
    let mockAreaRepo: any

    beforeEach(() => {
      vi.clearAllMocks()

      mockAreaRepo = {
        update: vi.fn(),
        delete: vi.fn()
      }

      areaService = new AreaService(mockAreaRepo)
    })

    describe('update', () => {
      it('should pass userId to repository for authorization', async () => {
        const userId = 'user-1'
        const input = { id: 'area-1', name: 'Updated Name' }
        const updatedArea = { id: 'area-1', userId, name: 'Updated Name' }

        mockAreaRepo.update.mockResolvedValue(updatedArea)

        await areaService.update(userId, input)

        expect(mockAreaRepo.update).toHaveBeenCalledWith('area-1', userId, input)
      })

      it('should propagate authorization errors from repository', async () => {
        const userId = 'user-1'
        const input = { id: 'area-1', name: 'Updated Name' }

        mockAreaRepo.update.mockRejectedValue(
          new TRPCError({ code: 'NOT_FOUND', message: 'Area area-1 not found' })
        )

        await expect(areaService.update(userId, input)).rejects.toMatchObject({
          code: 'NOT_FOUND'
        })
      })
    })

    describe('delete', () => {
      it('should pass userId to repository for authorization', async () => {
        const userId = 'user-1'
        const areaId = 'area-1'

        mockAreaRepo.delete.mockResolvedValue({ id: areaId, userId })

        await areaService.delete(userId, areaId)

        expect(mockAreaRepo.delete).toHaveBeenCalledWith(areaId, userId)
      })

      it('should propagate authorization errors from repository', async () => {
        const userId = 'user-1'
        const areaId = 'area-1'

        mockAreaRepo.delete.mockRejectedValue(
          new TRPCError({ code: 'NOT_FOUND', message: 'Area area-1 not found' })
        )

        await expect(areaService.delete(userId, areaId)).rejects.toMatchObject({
          code: 'NOT_FOUND'
        })
      })
    })
  })

  describe('ObjectiveService', () => {
    let objectiveService: ObjectiveService
    let mockObjectiveRepo: any
    let mockDiceService: any

    beforeEach(() => {
      vi.clearAllMocks()

      mockObjectiveRepo = {
        update: vi.fn(),
        complete: vi.fn(),
        delete: vi.fn()
      }

      mockDiceService = {
        addDiceToBank: vi.fn().mockResolvedValue({ earned: 6 })
      }

      objectiveService = new ObjectiveService(mockObjectiveRepo, mockDiceService)
    })

    describe('update', () => {
      it('should pass userId to repository for authorization', async () => {
        const userId = 'user-1'
        const input = { id: 'objective-1', name: 'Updated Name' }
        const updatedObjective = { id: 'objective-1', userId, name: 'Updated Name' }

        mockObjectiveRepo.update.mockResolvedValue(updatedObjective)

        await objectiveService.update(userId, input)

        expect(mockObjectiveRepo.update).toHaveBeenCalledWith('objective-1', userId, input)
      })
    })

    describe('complete', () => {
      it('should pass userId to repository for authorization', async () => {
        const userId = 'user-1'
        const objectiveId = 'objective-1'
        const completedObjective = { id: objectiveId, userId, completedAt: new Date() }

        mockObjectiveRepo.complete.mockResolvedValue(completedObjective)

        await objectiveService.complete(userId, objectiveId)

        expect(mockObjectiveRepo.complete).toHaveBeenCalledWith(objectiveId, userId)
      })
    })

    describe('delete', () => {
      it('should pass userId to repository for authorization', async () => {
        const userId = 'user-1'
        const objectiveId = 'objective-1'

        mockObjectiveRepo.delete.mockResolvedValue({ id: objectiveId, userId })

        await objectiveService.delete(userId, objectiveId)

        expect(mockObjectiveRepo.delete).toHaveBeenCalledWith(objectiveId, userId)
      })
    })
  })

  describe('CharacterService', () => {
    let characterService: CharacterService
    let mockCharacterRepo: any

    beforeEach(() => {
      vi.clearAllMocks()

      mockCharacterRepo = {
        findByIdWithClassesOrThrow: vi.fn(),
        verifyOwnership: vi.fn()
      }

      characterService = new CharacterService(mockCharacterRepo)
    })

    describe('getCharacterById', () => {
      it('should pass userId to repository for authorization when provided', async () => {
        const characterId = 'char-1'
        const userId = 'user-1'
        const character = { id: characterId, userId, name: 'Test Character', classes: [] }

        mockCharacterRepo.findByIdWithClassesOrThrow.mockResolvedValue(character)

        await characterService.getCharacterById(characterId, userId)

        expect(mockCharacterRepo.findByIdWithClassesOrThrow).toHaveBeenCalledWith(characterId, userId)
      })

      it('should not require userId for public lookups', async () => {
        const characterId = 'char-1'
        const character = { id: characterId, userId: 'user-1', name: 'Test Character', classes: [] }

        mockCharacterRepo.findByIdWithClassesOrThrow.mockResolvedValue(character)

        await characterService.getCharacterById(characterId)

        expect(mockCharacterRepo.findByIdWithClassesOrThrow).toHaveBeenCalledWith(characterId, undefined)
      })
    })

    describe('verifyCharacterOwnership', () => {
      it('should return true when user owns character', async () => {
        const characterId = 'char-1'
        const userId = 'user-1'

        mockCharacterRepo.verifyOwnership.mockResolvedValue(true)

        const result = await characterService.verifyCharacterOwnership(characterId, userId)

        expect(result).toBe(true)
        expect(mockCharacterRepo.verifyOwnership).toHaveBeenCalledWith(characterId, userId)
      })

      it('should return false when user does not own character', async () => {
        const characterId = 'char-1'
        const userId = 'user-1'

        mockCharacterRepo.verifyOwnership.mockResolvedValue(false)

        const result = await characterService.verifyCharacterOwnership(characterId, userId)

        expect(result).toBe(false)
      })
    })
  })
})
