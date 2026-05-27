import type { PrismaClient } from '@/generated/prisma'
import { TRPCError } from '@trpc/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CharacterRepository } from '../../repositories/character.repository'
import { createRepoMock } from '../helpers/mock-repo'

describe('CharacterRepository - Authorization', () => {
  let characterRepository: CharacterRepository
  let characterModel: ReturnType<typeof createRepoMock<PrismaClient['character']>>
  let mockPrisma: PrismaClient

  beforeEach(() => {
    vi.clearAllMocks()

    characterModel = createRepoMock<PrismaClient['character']>()
    mockPrisma = { character: characterModel } as unknown as PrismaClient

    characterRepository = new CharacterRepository(mockPrisma)
  })

  describe('verifyOwnership', () => {
    it('should return true when user owns the character', async () => {
      const characterId = 'char-1'
      const userId = 'user-1'

      characterModel.findUnique.mockResolvedValue({ userId } as never)

      const result = await characterRepository.verifyOwnership(characterId, userId)

      expect(result).toBe(true)
      expect(characterModel.findUnique).toHaveBeenCalledWith({
        where: { id: characterId },
        select: { userId: true }
      })
    })

    it('should return false when user does not own the character', async () => {
      const characterId = 'char-1'
      const userId = 'user-1'
      const otherUserId = 'user-2'

      characterModel.findUnique.mockResolvedValue({ userId: otherUserId } as never)

      const result = await characterRepository.verifyOwnership(characterId, userId)

      expect(result).toBe(false)
    })

    it('should return false when character does not exist', async () => {
      const characterId = 'non-existent'
      const userId = 'user-1'

      characterModel.findUnique.mockResolvedValue(null as never)

      const result = await characterRepository.verifyOwnership(characterId, userId)

      expect(result).toBe(false)
    })
  })

  describe('findByIdWithClassesOrThrow', () => {
    it('should return character when found and no userId check required', async () => {
      const characterId = 'char-1'
      const character = {
        id: characterId,
        userId: 'user-1',
        name: 'Test Character',
        classes: []
      }

      characterModel.findUnique.mockResolvedValue(character as never)

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

      characterModel.findUnique.mockResolvedValue(character as never)

      const result = await characterRepository.findByIdWithClassesOrThrow(characterId, userId)

      expect(result).toEqual(character)
    })

    it('should throw NOT_FOUND when character does not exist', async () => {
      const characterId = 'non-existent'

      characterModel.findUnique.mockResolvedValue(null as never)

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

      characterModel.findUnique.mockResolvedValue(character as never)

      await expect(characterRepository.findByIdWithClassesOrThrow(characterId, userId)).rejects.toThrow(TRPCError)
      await expect(characterRepository.findByIdWithClassesOrThrow(characterId, userId)).rejects.toMatchObject({
        code: 'NOT_FOUND'
      })
    })
  })
})
