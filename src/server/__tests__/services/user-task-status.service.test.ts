import { TRPCError } from '@trpc/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { UserTaskStatusRepository } from '../../repositories/user-task-status.repository'
import { UserTaskStatusService } from '../../services/user-task-status.service'
import { createRepoMock } from '../helpers/mock-repo'

const buildStatus = (overrides: Partial<{ id: string; label: string; isDefault: boolean }> = {}) => ({
  id: 'status-1',
  userId: 'user-1',
  label: 'TODO',
  color: 'gray',
  isDefault: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
})

describe('UserTaskStatusService', () => {
  let mockRepo: ReturnType<typeof createRepoMock<UserTaskStatusRepository>>
  let service: UserTaskStatusService

  beforeEach(() => {
    vi.clearAllMocks()
    mockRepo = createRepoMock<UserTaskStatusRepository>()
    service = new UserTaskStatusService(mockRepo)
  })

  describe('create', () => {
    it('creates a status', async () => {
      const created = buildStatus({ id: 's1', label: 'Waiting' })
      mockRepo.findAll.mockResolvedValue([])
      mockRepo.create.mockResolvedValue(created)
      const result = await service.create('user-1', { label: 'Waiting', color: 'yellow' })
      expect(result.status).toEqual(created)
    })

    it('rejects when label is a reserved protected label', async () => {
      await expect(service.create('user-1', { label: 'DONE' })).rejects.toBeInstanceOf(TRPCError)
      await expect(service.create('user-1', { label: 'TODO' })).rejects.toBeInstanceOf(TRPCError)
      await expect(service.create('user-1', { label: 'DOING' })).rejects.toBeInstanceOf(TRPCError)
    })

    it('rejects when label collides with an existing status', async () => {
      mockRepo.findAll.mockResolvedValue([buildStatus({ id: 'w1', label: 'Waiting' })])
      await expect(service.create('user-1', { label: 'Waiting' })).rejects.toBeInstanceOf(TRPCError)
    })
  })

  describe('update', () => {
    it('rejects renaming any protected status', async () => {
      for (const label of ['TODO', 'DOING', 'DONE']) {
        mockRepo.findByIdOrThrow.mockResolvedValue(buildStatus({ id: 'p1', label }))
        await expect(service.update('user-1', { id: 'p1', label: 'Other' })).rejects.toBeInstanceOf(TRPCError)
      }
    })

    it('rejects renaming a non-protected status to a protected label', async () => {
      mockRepo.findByIdOrThrow.mockResolvedValue(buildStatus({ id: 's1', label: 'Waiting' }))
      await expect(service.update('user-1', { id: 's1', label: 'DONE' })).rejects.toBeInstanceOf(TRPCError)
    })

    it('allows color-only edit on a protected status', async () => {
      const doneRow = buildStatus({ id: 'd1', label: 'DONE' })
      mockRepo.findByIdOrThrow.mockResolvedValue(doneRow)
      mockRepo.update.mockResolvedValue({ ...doneRow, color: 'red' })
      const result = await service.update('user-1', { id: 'd1', color: 'red' })
      expect(result.status.color).toBe('red')
    })

    it('rejects renaming to a label that collides with another status', async () => {
      mockRepo.findByIdOrThrow.mockResolvedValue(buildStatus({ id: 's1', label: 'Waiting' }))
      mockRepo.findAll.mockResolvedValue([
        buildStatus({ id: 's1', label: 'Waiting' }),
        buildStatus({ id: 's2', label: 'Blocked' })
      ])
      await expect(service.update('user-1', { id: 's1', label: 'Blocked' })).rejects.toBeInstanceOf(TRPCError)
    })
  })

  describe('delete', () => {
    it('rejects deleting any protected status', async () => {
      for (const label of ['TODO', 'DOING', 'DONE']) {
        mockRepo.findByIdOrThrow.mockResolvedValue(buildStatus({ id: 'p1', label }))
        await expect(service.delete('user-1', 'p1')).rejects.toBeInstanceOf(TRPCError)
      }
    })

    it('rejects deleting when only one status remains', async () => {
      mockRepo.findByIdOrThrow.mockResolvedValue(buildStatus({ id: 's1', label: 'Only' }))
      mockRepo.countByUserId.mockResolvedValue(1)
      await expect(service.delete('user-1', 's1')).rejects.toBeInstanceOf(TRPCError)
    })

    it('reassigns affected tasks to the default status', async () => {
      mockRepo.findByIdOrThrow.mockResolvedValue(buildStatus({ id: 's1', label: 'Waiting' }))
      mockRepo.countByUserId.mockResolvedValue(3)
      const defaultRow = buildStatus({ id: 'todo', label: 'TODO', isDefault: true })
      mockRepo.findDefault.mockResolvedValue(defaultRow)
      mockRepo.delete.mockResolvedValue(undefined)

      await service.delete('user-1', 's1')

      expect(mockRepo.delete).toHaveBeenCalledWith('s1', 'user-1', 'todo')
    })
  })

  describe('bulkApply', () => {
    it('applies create/update/delete in a single call', async () => {
      const existing = [
        buildStatus({ id: 'todo', label: 'TODO', isDefault: true }),
        buildStatus({ id: 'doing', label: 'DOING' }),
        buildStatus({ id: 'done', label: 'DONE' }),
        buildStatus({ id: 'old', label: 'Old' })
      ]
      mockRepo.findAll.mockResolvedValueOnce(existing).mockResolvedValueOnce([...existing])
      mockRepo.bulkApply.mockResolvedValue(undefined)

      await service.bulkApply('user-1', {
        create: [{ label: 'Waiting', color: 'amber' }],
        update: [{ id: 'todo', color: 'navy' }],
        delete: [{ id: 'old' }]
      })

      expect(mockRepo.bulkApply).toHaveBeenCalledWith('user-1', expect.objectContaining({
        create: [{ label: 'Waiting', color: 'amber' }],
        update: [{ id: 'todo', color: 'navy' }],
        delete: ['old'],
        reassignToStatusId: 'todo'
      }))
    })

    it('rejects deleting a protected status', async () => {
      mockRepo.findAll.mockResolvedValue([
        buildStatus({ id: 'todo', label: 'TODO', isDefault: true }),
        buildStatus({ id: 'doing', label: 'DOING' }),
        buildStatus({ id: 'done', label: 'DONE' })
      ])
      await expect(
        service.bulkApply('user-1', { create: [], update: [], delete: [{ id: 'doing' }] })
      ).rejects.toBeInstanceOf(TRPCError)
    })

    it('rejects when final state misses a protected label', async () => {
      mockRepo.findAll.mockResolvedValue([
        buildStatus({ id: 'todo', label: 'TODO', isDefault: true }),
        buildStatus({ id: 'doing', label: 'DOING' }),
        buildStatus({ id: 'done', label: 'DONE' }),
        buildStatus({ id: 'extra', label: 'Extra' })
      ])
      await expect(
        service.bulkApply('user-1', {
          create: [],
          update: [{ id: 'extra', label: 'TODO' }],
          delete: []
        })
      ).rejects.toBeInstanceOf(TRPCError)
    })

    it('rejects when two final labels collide', async () => {
      mockRepo.findAll.mockResolvedValue([
        buildStatus({ id: 'todo', label: 'TODO', isDefault: true }),
        buildStatus({ id: 'doing', label: 'DOING' }),
        buildStatus({ id: 'done', label: 'DONE' }),
        buildStatus({ id: 'a', label: 'Waiting' }),
        buildStatus({ id: 'b', label: 'Blocked' })
      ])
      await expect(
        service.bulkApply('user-1', {
          create: [],
          update: [{ id: 'b', label: 'Waiting' }],
          delete: []
        })
      ).rejects.toBeInstanceOf(TRPCError)
    })
  })
})
