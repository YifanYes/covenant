import { TRPCError } from '@trpc/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AreaRepository } from '../../repositories/area.repository'

describe('AreaRepository - Authorization', () => {
  let areaRepository: AreaRepository
  let mockPrisma: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockPrisma = {
      area: {
        findUnique: vi.fn(),
        update: vi.fn(),
        delete: vi.fn()
      }
    }

    areaRepository = new AreaRepository(mockPrisma)
  })

  describe('update', () => {
    it('should update area when user owns it', async () => {
      const areaId = 'area-1'
      const userId = 'user-1'
      const input = { id: areaId, name: 'Updated Name' }
      const existingArea = { id: areaId, userId, name: 'Old Name' }
      const updatedArea = { id: areaId, userId, name: 'Updated Name' }

      mockPrisma.area.findUnique.mockResolvedValue(existingArea)
      mockPrisma.area.update.mockResolvedValue(updatedArea)

      const result = await areaRepository.update(areaId, userId, input)

      expect(result).toEqual(updatedArea)
      expect(mockPrisma.area.findUnique).toHaveBeenCalledWith({ where: { id: areaId } })
      expect(mockPrisma.area.update).toHaveBeenCalled()
    })

    it('should throw NOT_FOUND when area does not exist', async () => {
      const areaId = 'non-existent'
      const userId = 'user-1'
      const input = { id: areaId, name: 'Updated Name' }

      mockPrisma.area.findUnique.mockResolvedValue(null)

      await expect(areaRepository.update(areaId, userId, input)).rejects.toThrow(TRPCError)
      await expect(areaRepository.update(areaId, userId, input)).rejects.toMatchObject({
        code: 'NOT_FOUND'
      })
      expect(mockPrisma.area.update).not.toHaveBeenCalled()
    })

    it('should throw NOT_FOUND when user does not own the area', async () => {
      const areaId = 'area-1'
      const userId = 'user-1'
      const otherUserId = 'user-2'
      const input = { id: areaId, name: 'Updated Name' }
      const existingArea = { id: areaId, userId: otherUserId, name: 'Old Name' }

      mockPrisma.area.findUnique.mockResolvedValue(existingArea)

      await expect(areaRepository.update(areaId, userId, input)).rejects.toThrow(TRPCError)
      await expect(areaRepository.update(areaId, userId, input)).rejects.toMatchObject({
        code: 'NOT_FOUND'
      })
      expect(mockPrisma.area.update).not.toHaveBeenCalled()
    })
  })

  describe('delete', () => {
    it('should delete area when user owns it', async () => {
      const areaId = 'area-1'
      const userId = 'user-1'
      const existingArea = { id: areaId, userId, name: 'Test Area' }

      mockPrisma.area.findUnique.mockResolvedValue(existingArea)
      mockPrisma.area.delete.mockResolvedValue(existingArea)

      const result = await areaRepository.delete(areaId, userId)

      expect(result).toEqual(existingArea)
      expect(mockPrisma.area.findUnique).toHaveBeenCalledWith({ where: { id: areaId } })
      expect(mockPrisma.area.delete).toHaveBeenCalledWith({ where: { id: areaId } })
    })

    it('should throw NOT_FOUND when area does not exist', async () => {
      const areaId = 'non-existent'
      const userId = 'user-1'

      mockPrisma.area.findUnique.mockResolvedValue(null)

      await expect(areaRepository.delete(areaId, userId)).rejects.toThrow(TRPCError)
      await expect(areaRepository.delete(areaId, userId)).rejects.toMatchObject({
        code: 'NOT_FOUND'
      })
      expect(mockPrisma.area.delete).not.toHaveBeenCalled()
    })

    it('should throw NOT_FOUND when user does not own the area', async () => {
      const areaId = 'area-1'
      const userId = 'user-1'
      const otherUserId = 'user-2'
      const existingArea = { id: areaId, userId: otherUserId, name: 'Test Area' }

      mockPrisma.area.findUnique.mockResolvedValue(existingArea)

      await expect(areaRepository.delete(areaId, userId)).rejects.toThrow(TRPCError)
      await expect(areaRepository.delete(areaId, userId)).rejects.toMatchObject({
        code: 'NOT_FOUND'
      })
      expect(mockPrisma.area.delete).not.toHaveBeenCalled()
    })
  })
})
