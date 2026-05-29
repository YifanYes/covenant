import { TRPCError } from '@trpc/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { UserTaskStatusRepository } from '../../repositories/user-task-status.repository'
import { UserTaskStatusService } from '../../services/user-task-status.service'
import { createRepoMock } from '../helpers/mock-repo'

const buildStatus = (overrides: Partial<{ id: bigint; publicId: string; label: string; isDefault: boolean }> = {}) => ({
  id: BigInt(1),
  publicId: 'pubid0000001',
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
      const created = buildStatus({ id: BigInt(10), publicId: 'newpub000010', label: 'Waiting' })
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
      mockRepo.findAll.mockResolvedValue([buildStatus({ id: BigInt(30), publicId: 'collide00030', label: 'Waiting' })])
      await expect(service.create('user-1', { label: 'Waiting' })).rejects.toBeInstanceOf(TRPCError)
    })
  })

  describe('update', () => {
    it('rejects renaming any protected status', async () => {
      for (const label of ['TODO', 'DOING', 'DONE']) {
        const pub = `pubid000${label.slice(0, 4).toLowerCase()}`
        mockRepo.findByPublicIdOrThrow.mockResolvedValue(buildStatus({ id: BigInt(20), publicId: pub, label }))
        await expect(service.update('user-1', { publicId: pub, label: 'Other' })).rejects.toBeInstanceOf(TRPCError)
      }
    })

    it('rejects renaming a non-protected status to a protected label', async () => {
      mockRepo.findByPublicIdOrThrow.mockResolvedValue(buildStatus({ id: BigInt(10), publicId: 'pubidwaiting', label: 'Waiting' }))
      await expect(service.update('user-1', { publicId: 'pubidwaiting', label: 'DONE' })).rejects.toBeInstanceOf(TRPCError)
    })

    it('allows color-only edit on a protected status', async () => {
      const doneRow = buildStatus({ id: BigInt(40), publicId: 'pubdonexxxxx', label: 'DONE' })
      mockRepo.findByPublicIdOrThrow.mockResolvedValue(doneRow)
      mockRepo.update.mockResolvedValue({ ...doneRow, color: 'red' })
      const result = await service.update('user-1', { publicId: 'pubdonexxxxx', color: 'red' })
      expect(result.status.color).toBe('red')
    })

    it('rejects renaming to a label that collides with another status', async () => {
      mockRepo.findByPublicIdOrThrow.mockResolvedValue(buildStatus({ id: BigInt(10), publicId: 'pubidwaiting', label: 'Waiting' }))
      mockRepo.findAll.mockResolvedValue([
        buildStatus({ id: BigInt(10), publicId: 'pubidwaiting', label: 'Waiting' }),
        buildStatus({ id: BigInt(11), publicId: 'pubidblocked', label: 'Blocked' })
      ])
      await expect(service.update('user-1', { publicId: 'pubidwaiting', label: 'Blocked' })).rejects.toBeInstanceOf(TRPCError)
    })
  })

  describe('delete', () => {
    it('rejects deleting any protected status', async () => {
      for (const label of ['TODO', 'DOING', 'DONE']) {
        const pub = `pubprot00${label.slice(0, 3).toLowerCase()}`
        mockRepo.findByPublicIdOrThrow.mockResolvedValue(buildStatus({ id: BigInt(20), publicId: pub, label }))
        await expect(service.delete('user-1', pub)).rejects.toBeInstanceOf(TRPCError)
      }
    })

    it('rejects deleting when only one status remains', async () => {
      mockRepo.findByPublicIdOrThrow.mockResolvedValue(buildStatus({ id: BigInt(10), publicId: 'pubonlyxxxxx', label: 'Only' }))
      mockRepo.countByUserId.mockResolvedValue(1)
      await expect(service.delete('user-1', 'pubonlyxxxxx')).rejects.toBeInstanceOf(TRPCError)
    })

    it('reassigns affected tasks to the default status', async () => {
      mockRepo.findByPublicIdOrThrow.mockResolvedValue(buildStatus({ id: BigInt(10), publicId: 'pubwaiting00', label: 'Waiting' }))
      mockRepo.countByUserId.mockResolvedValue(3)
      const defaultRow = buildStatus({ id: BigInt(50), publicId: 'pubdefault00', label: 'TODO', isDefault: true })
      mockRepo.findDefault.mockResolvedValue(defaultRow)
      mockRepo.delete.mockResolvedValue(undefined)

      await service.delete('user-1', 'pubwaiting00')

      expect(mockRepo.delete).toHaveBeenCalledWith(BigInt(10), 'user-1', BigInt(50))
    })
  })

  describe('bulkApply', () => {
    it('applies create/update/delete in a single call', async () => {
      const existing = [
        buildStatus({ id: BigInt(50), publicId: 'pubtodo000001', label: 'TODO', isDefault: true }),
        buildStatus({ id: BigInt(51), publicId: 'pubdoing00001', label: 'DOING' }),
        buildStatus({ id: BigInt(52), publicId: 'pubdone000001', label: 'DONE' }),
        buildStatus({ id: BigInt(60), publicId: 'puboldxxxxxxx', label: 'Old' })
      ]
      mockRepo.findAll.mockResolvedValueOnce(existing).mockResolvedValueOnce([...existing])
      mockRepo.bulkApply.mockResolvedValue(undefined)

      await service.bulkApply('user-1', {
        create: [{ label: 'Waiting', color: 'amber' }],
        update: [{ publicId: 'pubtodo000001', color: 'navy' }],
        delete: [{ publicId: 'puboldxxxxxxx' }]
      })

      expect(mockRepo.bulkApply).toHaveBeenCalledWith('user-1', expect.objectContaining({
        create: [{ label: 'Waiting', color: 'amber' }],
        update: [{ id: BigInt(50), color: 'navy', label: undefined }],
        delete: [BigInt(60)],
        reassignToStatusId: BigInt(50)
      }))
    })

    it('rejects deleting a protected status', async () => {
      mockRepo.findAll.mockResolvedValue([
        buildStatus({ id: BigInt(50), publicId: 'pubtodo000001', label: 'TODO', isDefault: true }),
        buildStatus({ id: BigInt(51), publicId: 'pubdoing00001', label: 'DOING' }),
        buildStatus({ id: BigInt(52), publicId: 'pubdone000001', label: 'DONE' })
      ])
      await expect(
        service.bulkApply('user-1', { create: [], update: [], delete: [{ publicId: 'pubdoing00001' }] })
      ).rejects.toBeInstanceOf(TRPCError)
    })

    it('rejects when final state misses a protected label', async () => {
      mockRepo.findAll.mockResolvedValue([
        buildStatus({ id: BigInt(50), publicId: 'pubtodo000001', label: 'TODO', isDefault: true }),
        buildStatus({ id: BigInt(51), publicId: 'pubdoing00001', label: 'DOING' }),
        buildStatus({ id: BigInt(52), publicId: 'pubdone000001', label: 'DONE' }),
        buildStatus({ id: BigInt(70), publicId: 'pubextraxxxxx', label: 'Extra' })
      ])
      await expect(
        service.bulkApply('user-1', {
          create: [],
          update: [{ publicId: 'pubextraxxxxx', label: 'TODO' }],
          delete: []
        })
      ).rejects.toBeInstanceOf(TRPCError)
    })

    it('rejects when two final labels collide', async () => {
      mockRepo.findAll.mockResolvedValue([
        buildStatus({ id: BigInt(50), publicId: 'pubtodo000001', label: 'TODO', isDefault: true }),
        buildStatus({ id: BigInt(51), publicId: 'pubdoing00001', label: 'DOING' }),
        buildStatus({ id: BigInt(52), publicId: 'pubdone000001', label: 'DONE' }),
        buildStatus({ id: BigInt(80), publicId: 'pubwait00001x', label: 'Waiting' }),
        buildStatus({ id: BigInt(81), publicId: 'pubblock0001x', label: 'Blocked' })
      ])
      await expect(
        service.bulkApply('user-1', {
          create: [],
          update: [{ publicId: 'pubblock0001x', label: 'Waiting' }],
          delete: []
        })
      ).rejects.toBeInstanceOf(TRPCError)
    })
  })
})
