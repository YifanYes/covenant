import { TRPCError } from '@trpc/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ObjectiveRepository } from '../../repositories/objective.repository'

describe('ObjectiveRepository - Authorization', () => {
  let objectiveRepository: ObjectiveRepository
  let mockPrisma: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockPrisma = {
      objective: {
        findUnique: vi.fn(),
        update: vi.fn(),
        delete: vi.fn()
      }
    }

    objectiveRepository = new ObjectiveRepository(mockPrisma)
  })

  describe('update', () => {
    it('should update objective when user owns it', async () => {
      const objectiveId = 'objective-1'
      const userId = 'user-1'
      const input = { id: objectiveId, name: 'Updated Name' }
      const existingObjective = { id: objectiveId, userId, name: 'Old Name' }
      const updatedObjective = { id: objectiveId, userId, name: 'Updated Name' }

      mockPrisma.objective.findUnique.mockResolvedValue(existingObjective)
      mockPrisma.objective.update.mockResolvedValue(updatedObjective)

      const result = await objectiveRepository.update(objectiveId, userId, input)

      expect(result).toEqual(updatedObjective)
      expect(mockPrisma.objective.findUnique).toHaveBeenCalledWith({ where: { id: objectiveId } })
      expect(mockPrisma.objective.update).toHaveBeenCalled()
    })

    it('should throw NOT_FOUND when objective does not exist', async () => {
      const objectiveId = 'non-existent'
      const userId = 'user-1'
      const input = { id: objectiveId, name: 'Updated Name' }

      mockPrisma.objective.findUnique.mockResolvedValue(null)

      await expect(objectiveRepository.update(objectiveId, userId, input)).rejects.toThrow(TRPCError)
      await expect(objectiveRepository.update(objectiveId, userId, input)).rejects.toMatchObject({
        code: 'NOT_FOUND'
      })
      expect(mockPrisma.objective.update).not.toHaveBeenCalled()
    })

    it('should throw NOT_FOUND when user does not own the objective', async () => {
      const objectiveId = 'objective-1'
      const userId = 'user-1'
      const otherUserId = 'user-2'
      const input = { id: objectiveId, name: 'Updated Name' }
      const existingObjective = { id: objectiveId, userId: otherUserId, name: 'Old Name' }

      mockPrisma.objective.findUnique.mockResolvedValue(existingObjective)

      await expect(objectiveRepository.update(objectiveId, userId, input)).rejects.toThrow(TRPCError)
      await expect(objectiveRepository.update(objectiveId, userId, input)).rejects.toMatchObject({
        code: 'NOT_FOUND'
      })
      expect(mockPrisma.objective.update).not.toHaveBeenCalled()
    })
  })

  describe('complete', () => {
    it('should complete objective when user owns it', async () => {
      const objectiveId = 'objective-1'
      const userId = 'user-1'
      const existingObjective = { id: objectiveId, userId, name: 'Test Objective', completedAt: null }
      const completedObjective = { ...existingObjective, completedAt: new Date() }

      mockPrisma.objective.findUnique.mockResolvedValue(existingObjective)
      mockPrisma.objective.update.mockResolvedValue(completedObjective)

      const result = await objectiveRepository.complete(objectiveId, userId)

      expect(result.completedAt).toBeDefined()
      expect(mockPrisma.objective.findUnique).toHaveBeenCalledWith({ where: { id: objectiveId } })
      expect(mockPrisma.objective.update).toHaveBeenCalled()
    })

    it('should throw NOT_FOUND when objective does not exist', async () => {
      const objectiveId = 'non-existent'
      const userId = 'user-1'

      mockPrisma.objective.findUnique.mockResolvedValue(null)

      await expect(objectiveRepository.complete(objectiveId, userId)).rejects.toThrow(TRPCError)
      await expect(objectiveRepository.complete(objectiveId, userId)).rejects.toMatchObject({
        code: 'NOT_FOUND'
      })
      expect(mockPrisma.objective.update).not.toHaveBeenCalled()
    })

    it('should throw NOT_FOUND when user does not own the objective', async () => {
      const objectiveId = 'objective-1'
      const userId = 'user-1'
      const otherUserId = 'user-2'
      const existingObjective = { id: objectiveId, userId: otherUserId, name: 'Test Objective' }

      mockPrisma.objective.findUnique.mockResolvedValue(existingObjective)

      await expect(objectiveRepository.complete(objectiveId, userId)).rejects.toThrow(TRPCError)
      await expect(objectiveRepository.complete(objectiveId, userId)).rejects.toMatchObject({
        code: 'NOT_FOUND'
      })
      expect(mockPrisma.objective.update).not.toHaveBeenCalled()
    })
  })

  describe('delete', () => {
    it('should delete objective when user owns it', async () => {
      const objectiveId = 'objective-1'
      const userId = 'user-1'
      const existingObjective = { id: objectiveId, userId, name: 'Test Objective' }

      mockPrisma.objective.findUnique.mockResolvedValue(existingObjective)
      mockPrisma.objective.delete.mockResolvedValue(existingObjective)

      const result = await objectiveRepository.delete(objectiveId, userId)

      expect(result).toEqual(existingObjective)
      expect(mockPrisma.objective.findUnique).toHaveBeenCalledWith({ where: { id: objectiveId } })
      expect(mockPrisma.objective.delete).toHaveBeenCalledWith({ where: { id: objectiveId } })
    })

    it('should throw NOT_FOUND when objective does not exist', async () => {
      const objectiveId = 'non-existent'
      const userId = 'user-1'

      mockPrisma.objective.findUnique.mockResolvedValue(null)

      await expect(objectiveRepository.delete(objectiveId, userId)).rejects.toThrow(TRPCError)
      await expect(objectiveRepository.delete(objectiveId, userId)).rejects.toMatchObject({
        code: 'NOT_FOUND'
      })
      expect(mockPrisma.objective.delete).not.toHaveBeenCalled()
    })

    it('should throw NOT_FOUND when user does not own the objective', async () => {
      const objectiveId = 'objective-1'
      const userId = 'user-1'
      const otherUserId = 'user-2'
      const existingObjective = { id: objectiveId, userId: otherUserId, name: 'Test Objective' }

      mockPrisma.objective.findUnique.mockResolvedValue(existingObjective)

      await expect(objectiveRepository.delete(objectiveId, userId)).rejects.toThrow(TRPCError)
      await expect(objectiveRepository.delete(objectiveId, userId)).rejects.toMatchObject({
        code: 'NOT_FOUND'
      })
      expect(mockPrisma.objective.delete).not.toHaveBeenCalled()
    })
  })
})
