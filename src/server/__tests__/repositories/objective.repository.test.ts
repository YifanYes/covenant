import type { PrismaClient } from '@/generated/prisma'
import { TRPCError } from '@trpc/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ObjectiveRepository } from '../../repositories/objective.repository'
import { createRepoMock } from '../helpers/mock-repo'

describe('ObjectiveRepository - Authorization', () => {
  let objectiveRepository: ObjectiveRepository
  let objectiveModel: ReturnType<typeof createRepoMock<PrismaClient['objective']>>
  let mockPrisma: PrismaClient

  beforeEach(() => {
    vi.clearAllMocks()

    objectiveModel = createRepoMock<PrismaClient['objective']>()
    mockPrisma = { objective: objectiveModel } as unknown as PrismaClient

    objectiveRepository = new ObjectiveRepository(mockPrisma)
  })

  describe('update', () => {
    it('should update objective when user owns it', async () => {
      const objectiveId = BigInt(10)
      const userId = 'user-1'
      const input = { publicId: 'objpub000010', name: 'Updated Name' }
      const existingObjective = { id: objectiveId, userId, name: 'Old Name' }
      const updatedObjective = { id: objectiveId, userId, name: 'Updated Name' }

      objectiveModel.findUnique.mockResolvedValue(existingObjective as never)
      objectiveModel.update.mockResolvedValue(updatedObjective as never)

      const result = await objectiveRepository.update(objectiveId, userId, input)

      expect(result).toEqual(updatedObjective)
      expect(objectiveModel.findUnique).toHaveBeenCalledWith({ where: { id: objectiveId } })
      expect(objectiveModel.update).toHaveBeenCalled()
    })

    it('should throw NOT_FOUND when objective does not exist', async () => {
      const objectiveId = BigInt(999)
      const userId = 'user-1'
      const input = { publicId: 'objpub000010', name: 'Updated Name' }

      objectiveModel.findUnique.mockResolvedValue(null as never)

      await expect(objectiveRepository.update(objectiveId, userId, input)).rejects.toThrow(TRPCError)
      await expect(objectiveRepository.update(objectiveId, userId, input)).rejects.toMatchObject({
        code: 'NOT_FOUND'
      })
      expect(objectiveModel.update).not.toHaveBeenCalled()
    })

    it('should throw NOT_FOUND when user does not own the objective', async () => {
      const objectiveId = BigInt(10)
      const userId = 'user-1'
      const otherUserId = 'user-2'
      const input = { publicId: 'objpub000010', name: 'Updated Name' }
      const existingObjective = { id: objectiveId, userId: otherUserId, name: 'Old Name' }

      objectiveModel.findUnique.mockResolvedValue(existingObjective as never)

      await expect(objectiveRepository.update(objectiveId, userId, input)).rejects.toThrow(TRPCError)
      await expect(objectiveRepository.update(objectiveId, userId, input)).rejects.toMatchObject({
        code: 'NOT_FOUND'
      })
      expect(objectiveModel.update).not.toHaveBeenCalled()
    })
  })

  describe('complete', () => {
    it('should complete objective when user owns it', async () => {
      const objectiveId = BigInt(10)
      const userId = 'user-1'
      const existingObjective = { id: objectiveId, userId, name: 'Test Objective', completedAt: null }
      const completedObjective = { ...existingObjective, completedAt: new Date() }

      objectiveModel.findUnique.mockResolvedValue(existingObjective as never)
      objectiveModel.update.mockResolvedValue(completedObjective as never)

      const result = await objectiveRepository.complete(objectiveId, userId)

      expect(result.completedAt).toBeDefined()
      expect(objectiveModel.findUnique).toHaveBeenCalledWith({ where: { id: objectiveId } })
      expect(objectiveModel.update).toHaveBeenCalled()
    })

    it('should throw NOT_FOUND when objective does not exist', async () => {
      const objectiveId = BigInt(999)
      const userId = 'user-1'

      objectiveModel.findUnique.mockResolvedValue(null as never)

      await expect(objectiveRepository.complete(objectiveId, userId)).rejects.toThrow(TRPCError)
      await expect(objectiveRepository.complete(objectiveId, userId)).rejects.toMatchObject({
        code: 'NOT_FOUND'
      })
      expect(objectiveModel.update).not.toHaveBeenCalled()
    })

    it('should throw NOT_FOUND when user does not own the objective', async () => {
      const objectiveId = BigInt(10)
      const userId = 'user-1'
      const otherUserId = 'user-2'
      const existingObjective = { id: objectiveId, userId: otherUserId, name: 'Test Objective' }

      objectiveModel.findUnique.mockResolvedValue(existingObjective as never)

      await expect(objectiveRepository.complete(objectiveId, userId)).rejects.toThrow(TRPCError)
      await expect(objectiveRepository.complete(objectiveId, userId)).rejects.toMatchObject({
        code: 'NOT_FOUND'
      })
      expect(objectiveModel.update).not.toHaveBeenCalled()
    })
  })

  describe('delete', () => {
    it('should delete objective when user owns it', async () => {
      const objectiveId = BigInt(10)
      const userId = 'user-1'
      const existingObjective = { id: objectiveId, userId, name: 'Test Objective' }

      objectiveModel.findUnique.mockResolvedValue(existingObjective as never)
      objectiveModel.delete.mockResolvedValue(existingObjective as never)

      const result = await objectiveRepository.delete(objectiveId, userId)

      expect(result).toEqual(existingObjective)
      expect(objectiveModel.findUnique).toHaveBeenCalledWith({ where: { id: objectiveId } })
      expect(objectiveModel.delete).toHaveBeenCalledWith({ where: { id: objectiveId } })
    })

    it('should throw NOT_FOUND when objective does not exist', async () => {
      const objectiveId = BigInt(999)
      const userId = 'user-1'

      objectiveModel.findUnique.mockResolvedValue(null as never)

      await expect(objectiveRepository.delete(objectiveId, userId)).rejects.toThrow(TRPCError)
      await expect(objectiveRepository.delete(objectiveId, userId)).rejects.toMatchObject({
        code: 'NOT_FOUND'
      })
      expect(objectiveModel.delete).not.toHaveBeenCalled()
    })

    it('should throw NOT_FOUND when user does not own the objective', async () => {
      const objectiveId = BigInt(10)
      const userId = 'user-1'
      const otherUserId = 'user-2'
      const existingObjective = { id: objectiveId, userId: otherUserId, name: 'Test Objective' }

      objectiveModel.findUnique.mockResolvedValue(existingObjective as never)

      await expect(objectiveRepository.delete(objectiveId, userId)).rejects.toThrow(TRPCError)
      await expect(objectiveRepository.delete(objectiveId, userId)).rejects.toMatchObject({
        code: 'NOT_FOUND'
      })
      expect(objectiveModel.delete).not.toHaveBeenCalled()
    })
  })
})
