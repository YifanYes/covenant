import type { PrismaClient } from '@/generated/prisma'
import { TRPCError } from '@trpc/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AreaRepository } from '../../repositories/area.repository'
import { createRepoMock } from '../helpers/mock-repo'

describe('AreaRepository - Authorization', () => {
  let areaRepository: AreaRepository
  let areaModel: ReturnType<typeof createRepoMock<PrismaClient['area']>>
  let mockPrisma: PrismaClient

  beforeEach(() => {
    vi.clearAllMocks()

    areaModel = createRepoMock<PrismaClient['area']>()
    mockPrisma = { area: areaModel } as unknown as PrismaClient

    areaRepository = new AreaRepository(mockPrisma)
  })

  describe('update', () => {
    it('should update area when user owns it', async () => {
      const areaId = BigInt(1)
      const userId = 'user-1'
      const input = { publicId: 'abcdefghijkl', name: 'Updated Name' }
      const existingArea = { id: areaId, userId, name: 'Old Name' }
      const updatedArea = { id: areaId, userId, name: 'Updated Name' }

      areaModel.findUnique.mockResolvedValue(existingArea as never)
      areaModel.update.mockResolvedValue(updatedArea as never)

      const result = await areaRepository.update(areaId, userId, input)

      expect(result).toEqual(updatedArea)
      expect(areaModel.findUnique).toHaveBeenCalledWith({ where: { id: areaId } })
      expect(areaModel.update).toHaveBeenCalled()
    })

    it('should throw NOT_FOUND when area does not exist', async () => {
      const areaId = BigInt(999)
      const userId = 'user-1'
      const input = { publicId: 'abcdefghijkl', name: 'Updated Name' }

      areaModel.findUnique.mockResolvedValue(null as never)

      await expect(areaRepository.update(areaId, userId, input)).rejects.toThrow(TRPCError)
      await expect(areaRepository.update(areaId, userId, input)).rejects.toMatchObject({
        code: 'NOT_FOUND'
      })
      expect(areaModel.update).not.toHaveBeenCalled()
    })

    it('should throw NOT_FOUND when user does not own the area', async () => {
      const areaId = BigInt(1)
      const userId = 'user-1'
      const otherUserId = 'user-2'
      const input = { publicId: 'abcdefghijkl', name: 'Updated Name' }
      const existingArea = { id: areaId, userId: otherUserId, name: 'Old Name' }

      areaModel.findUnique.mockResolvedValue(existingArea as never)

      await expect(areaRepository.update(areaId, userId, input)).rejects.toThrow(TRPCError)
      await expect(areaRepository.update(areaId, userId, input)).rejects.toMatchObject({
        code: 'NOT_FOUND'
      })
      expect(areaModel.update).not.toHaveBeenCalled()
    })
  })

  describe('delete', () => {
    it('should delete area when user owns it', async () => {
      const areaId = BigInt(1)
      const userId = 'user-1'
      const existingArea = { id: areaId, userId, name: 'Test Area' }

      areaModel.findUnique.mockResolvedValue(existingArea as never)
      areaModel.delete.mockResolvedValue(existingArea as never)

      const result = await areaRepository.delete(areaId, userId)

      expect(result).toEqual(existingArea)
      expect(areaModel.findUnique).toHaveBeenCalledWith({ where: { id: areaId } })
      expect(areaModel.delete).toHaveBeenCalledWith({ where: { id: areaId } })
    })

    it('should throw NOT_FOUND when area does not exist', async () => {
      const areaId = BigInt(999)
      const userId = 'user-1'

      areaModel.findUnique.mockResolvedValue(null as never)

      await expect(areaRepository.delete(areaId, userId)).rejects.toThrow(TRPCError)
      await expect(areaRepository.delete(areaId, userId)).rejects.toMatchObject({
        code: 'NOT_FOUND'
      })
      expect(areaModel.delete).not.toHaveBeenCalled()
    })

    it('should throw NOT_FOUND when user does not own the area', async () => {
      const areaId = BigInt(1)
      const userId = 'user-1'
      const otherUserId = 'user-2'
      const existingArea = { id: areaId, userId: otherUserId, name: 'Test Area' }

      areaModel.findUnique.mockResolvedValue(existingArea as never)

      await expect(areaRepository.delete(areaId, userId)).rejects.toThrow(TRPCError)
      await expect(areaRepository.delete(areaId, userId)).rejects.toMatchObject({
        code: 'NOT_FOUND'
      })
      expect(areaModel.delete).not.toHaveBeenCalled()
    })
  })
})
