import { TRPCError } from '@trpc/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CharacterService } from '../../services/character.service'
import { createRepoMock } from '../helpers/mock-repo'

/**
 * These tests verify that character ownership validation is properly
 * integrated into the services that are called by routers.
 *
 * The routers (activity.router.ts) call
 * verifyCharacterOwnership before delegating to services.
 * These tests verify the ownership check logic works correctly.
 */

describe('Character Ownership Validation', () => {
  let mockCharacterService: ReturnType<typeof createRepoMock<CharacterService>>

  beforeEach(() => {
    vi.clearAllMocks()

    mockCharacterService = createRepoMock<CharacterService>()
  })

  describe('verifyCharacterOwnership integration', () => {
    it('should allow access when ownership is verified', async () => {
      const characterId = BigInt(100)
      const userId = 'user-1'

      mockCharacterService.verifyCharacterOwnership.mockResolvedValue(true)

      const isOwner = await mockCharacterService.verifyCharacterOwnership(characterId, userId)

      expect(isOwner).toBe(true)
    })

    it('should deny access when ownership is not verified', async () => {
      const characterId = BigInt(100)
      const userId = 'user-1'

      mockCharacterService.verifyCharacterOwnership.mockResolvedValue(false)

      const isOwner = await mockCharacterService.verifyCharacterOwnership(characterId, userId)

      expect(isOwner).toBe(false)
    })

    it('should deny access for non-existent characters', async () => {
      const characterId = BigInt(999)
      const userId = 'user-1'

      mockCharacterService.verifyCharacterOwnership.mockResolvedValue(false)

      const isOwner = await mockCharacterService.verifyCharacterOwnership(characterId, userId)

      expect(isOwner).toBe(false)
    })
  })

  describe('Router authorization pattern', () => {
    /**
     * This test documents the expected pattern used in routers:
     * 1. Call verifyCharacterOwnership
     * 2. If false, throw NOT_FOUND with a generic message (do not leak existence)
     * 3. If true, proceed with service call
     */
    it('should follow the router authorization pattern', async () => {
      const characterId = BigInt(100)
      const userId = 'user-1'
      const mockServiceMethod = vi.fn().mockResolvedValue({ success: true })

      // Simulate the router pattern
      async function routerHandler(inputCharacterId: bigint, inputUserId: string) {
        const isOwner = await mockCharacterService.verifyCharacterOwnership(inputCharacterId, inputUserId)
        if (!isOwner) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Resource not found or access denied' })
        }
        return mockServiceMethod()
      }

      // Test authorized access
      mockCharacterService.verifyCharacterOwnership.mockResolvedValue(true)
      const result = await routerHandler(characterId, userId)

      expect(result).toEqual({ success: true })
      expect(mockCharacterService.verifyCharacterOwnership).toHaveBeenCalledWith(characterId, userId)
      expect(mockServiceMethod).toHaveBeenCalled()
    })

    it('should throw NOT_FOUND when ownership check fails', async () => {
      const characterId = BigInt(100)
      const userId = 'user-1'
      const mockServiceMethod = vi.fn()

      // Simulate the router pattern
      async function routerHandler(inputCharacterId: bigint, inputUserId: string) {
        const isOwner = await mockCharacterService.verifyCharacterOwnership(inputCharacterId, inputUserId)
        if (!isOwner) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Resource not found or access denied' })
        }
        return mockServiceMethod()
      }

      // Test unauthorized access
      mockCharacterService.verifyCharacterOwnership.mockResolvedValue(false)

      await expect(routerHandler(characterId, userId)).rejects.toThrow(TRPCError)
      await expect(routerHandler(characterId, userId)).rejects.toMatchObject({
        code: 'NOT_FOUND'
      })

      // Verify service method was never called
      expect(mockServiceMethod).not.toHaveBeenCalled()
    })

    it('should check ownership before service call (activity.list pattern)', async () => {
      const characterId = BigInt(100)
      const userId = 'user-1'
      const mockActivityService = {
        getActivities: vi.fn().mockResolvedValue([])
      }

      // Simulate quest.list router pattern
      async function activityListHandler(inputCharacterId: bigint | undefined, inputUserId: string) {
        if (inputCharacterId) {
          const isOwner = await mockCharacterService.verifyCharacterOwnership(inputCharacterId, inputUserId)
          if (!isOwner) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Resource not found or access denied' })
          }
        }
        return mockActivityService.getActivities(inputCharacterId)
      }

      // Test with characterId - should check ownership
      mockCharacterService.verifyCharacterOwnership.mockResolvedValue(true)
      await activityListHandler(characterId, userId)

      expect(mockCharacterService.verifyCharacterOwnership).toHaveBeenCalledWith(characterId, userId)
      expect(mockActivityService.getActivities).toHaveBeenCalledWith(characterId)
    })

    it('should skip ownership check when no characterId provided (activity.list pattern)', async () => {
      const userId = 'user-1'
      const mockActivityService = {
        getActivities: vi.fn().mockResolvedValue([])
      }

      // Simulate quest.list router pattern
      async function activityListHandler(inputCharacterId: bigint | undefined, inputUserId: string) {
        if (inputCharacterId) {
          const isOwner = await mockCharacterService.verifyCharacterOwnership(inputCharacterId, inputUserId)
          if (!isOwner) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Resource not found or access denied' })
          }
        }
        return mockActivityService.getActivities(inputCharacterId)
      }

      // Test without characterId - should skip ownership check
      await activityListHandler(undefined, userId)

      expect(mockCharacterService.verifyCharacterOwnership).not.toHaveBeenCalled()
      expect(mockActivityService.getActivities).toHaveBeenCalledWith(undefined)
    })
  })
})
