import { TRPCError } from '@trpc/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CharacterRepository } from '../../repositories/character.repository'

describe('CharacterRepository - Authorization', () => {
  let characterRepository: CharacterRepository
  let mockPrisma: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockPrisma = {
      character: {
        findUnique: vi.fn(),
        update: vi.fn()
      }
    }

    characterRepository = new CharacterRepository(mockPrisma)
  })

  describe('verifyOwnership', () => {
    it('should return true when user owns the character', async () => {
      const characterId = 'char-1'
      const userId = 'user-1'

      mockPrisma.character.findUnique.mockResolvedValue({ userId })

      const result = await characterRepository.verifyOwnership(characterId, userId)

      expect(result).toBe(true)
      expect(mockPrisma.character.findUnique).toHaveBeenCalledWith({
        where: { id: characterId },
        select: { userId: true }
      })
    })

    it('should return false when user does not own the character', async () => {
      const characterId = 'char-1'
      const userId = 'user-1'
      const otherUserId = 'user-2'

      mockPrisma.character.findUnique.mockResolvedValue({ userId: otherUserId })

      const result = await characterRepository.verifyOwnership(characterId, userId)

      expect(result).toBe(false)
    })

    it('should return false when character does not exist', async () => {
      const characterId = 'non-existent'
      const userId = 'user-1'

      mockPrisma.character.findUnique.mockResolvedValue(null)

      const result = await characterRepository.verifyOwnership(characterId, userId)

      expect(result).toBe(false)
    })
  })

  describe('findByIdWithClassesOrThrow', () => {
    beforeEach(() => {
      // Need to add the include for classes
      mockPrisma.character.findUnique = vi.fn()
    })

    it('should return character when found and no userId check required', async () => {
      const characterId = 'char-1'
      const character = {
        id: characterId,
        userId: 'user-1',
        name: 'Test Character',
        classes: []
      }

      mockPrisma.character.findUnique.mockResolvedValue(character)

      const result = await characterRepository.findByIdWithClassesOrThrow(characterId)

      expect(result).toEqual(character)
    })

    it('should return character when user owns it', async () => {
      const characterId = 'char-1'
      const userId = 'user-1'
      const character = {
        id: characterId,
        userId,
        name: 'Test Character',
        classes: []
      }

      mockPrisma.character.findUnique.mockResolvedValue(character)

      const result = await characterRepository.findByIdWithClassesOrThrow(characterId, userId)

      expect(result).toEqual(character)
    })

    it('should throw NOT_FOUND when character does not exist', async () => {
      const characterId = 'non-existent'

      mockPrisma.character.findUnique.mockResolvedValue(null)

      await expect(characterRepository.findByIdWithClassesOrThrow(characterId)).rejects.toThrow(TRPCError)
      await expect(characterRepository.findByIdWithClassesOrThrow(characterId)).rejects.toMatchObject({
        code: 'NOT_FOUND'
      })
    })

    it('should throw NOT_FOUND when user does not own the character', async () => {
      const characterId = 'char-1'
      const userId = 'user-1'
      const otherUserId = 'user-2'
      const character = {
        id: characterId,
        userId: otherUserId,
        name: 'Test Character',
        classes: []
      }

      mockPrisma.character.findUnique.mockResolvedValue(character)

      await expect(characterRepository.findByIdWithClassesOrThrow(characterId, userId)).rejects.toThrow(TRPCError)
      await expect(characterRepository.findByIdWithClassesOrThrow(characterId, userId)).rejects.toMatchObject({
        code: 'NOT_FOUND'
      })
    })
  })
})
