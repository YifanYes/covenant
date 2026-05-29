/* eslint-disable @typescript-eslint/no-explicit-any -- TODO: replace tx-model `any` with PrismaClient delegate types */
import { TRPCError } from '@trpc/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CharacterRepository } from '../../repositories/character.repository'
import type { TavernMessageRepository } from '../../repositories/tavern-message.repository'
import { TavernService } from '../../services/tavern.service'
import { createPrismaMock, createRepoMock } from '../helpers/mock-repo'

const MSG_PUB = 'tavmsg000001'

describe('TavernService', () => {
  let service: TavernService
  let prisma: ReturnType<typeof createPrismaMock>
  let messageRepo: ReturnType<typeof createRepoMock<TavernMessageRepository>>
  let characterRepo: ReturnType<typeof createRepoMock<CharacterRepository>>
  let txTavernMessage: ReturnType<typeof createRepoMock<any>>
  let txTavernReport: ReturnType<typeof createRepoMock<any>>

  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.TAVERN_DISABLED

    txTavernMessage = createRepoMock<any>()
    txTavernMessage.updateMany.mockResolvedValue({ count: 1 })
    txTavernReport = createRepoMock<any>()
    txTavernReport.create.mockResolvedValue({ id: 'rep-1' })

    prisma = createPrismaMock({ tavernMessage: txTavernMessage, tavernMessageReport: txTavernReport })

    messageRepo = createRepoMock<TavernMessageRepository>()
    messageRepo.findRecent.mockResolvedValue([])
    messageRepo.softDeleteByPublicIdAndAuthor.mockResolvedValue(1)

    characterRepo = createRepoMock<CharacterRepository>()
    characterRepo.findByUserId.mockResolvedValue({ id: 'char-1', userId: 'u1' } as never)

    service = new TavernService(prisma, messageRepo, characterRepo)
  })

  describe('getMessages', () => {
    it('returns messages in chronological order (oldest first)', async () => {
      const desc = [
        { id: BigInt(3), publicId: 'pubmsg000003', createdAt: new Date('2026-01-03'), userId: 'u1' },
        { id: BigInt(2), publicId: 'pubmsg000002', createdAt: new Date('2026-01-02'), userId: 'u2' },
        { id: BigInt(1), publicId: 'pubmsg000001', createdAt: new Date('2026-01-01'), userId: 'u3' }
      ]
      messageRepo.findRecent.mockResolvedValue(desc)
      const result = await service.getMessages({})
      expect(result.map((m: { id: bigint }) => m.id)).toEqual([BigInt(1), BigInt(2), BigInt(3)])
    })

    it('passes cursor and limit to the repository', async () => {
      const cursor = { createdAt: '2026-01-01T00:00:00.000Z', publicId: 'pubmsg000099' }
      await service.getMessages({ cursor, limit: 25 })
      expect(messageRepo.findRecent).toHaveBeenCalledWith({ cursor, limit: 25 })
    })
  })

  describe('sendMessage', () => {
    it('freezes characterId at send time', async () => {
      messageRepo.create.mockResolvedValue({ id: BigInt(1), publicId: MSG_PUB })
      await service.sendMessage({ content: 'Hello' }, 'u1')
      expect(messageRepo.create).toHaveBeenCalledWith({
        userId: 'u1',
        characterId: 'char-1',
        content: 'Hello'
      })
    })

    it('trims content before storage', async () => {
      messageRepo.create.mockResolvedValue({ id: BigInt(1), publicId: MSG_PUB })
      await service.sendMessage({ content: '  hi  ' }, 'u1')
      expect(messageRepo.create.mock.calls[0][0].content).toBe('hi')
    })

    it('rejects users without a character', async () => {
      characterRepo.findByUserId.mockResolvedValue(null)
      await expect(service.sendMessage({ content: 'hi' }, 'u1')).rejects.toBeInstanceOf(TRPCError)
      expect(messageRepo.create).not.toHaveBeenCalled()
    })

    it('rejects when TAVERN_DISABLED=1', async () => {
      process.env.TAVERN_DISABLED = '1'
      await expect(service.sendMessage({ content: 'hi' }, 'u1')).rejects.toMatchObject({
        code: 'SERVICE_UNAVAILABLE'
      })
      expect(messageRepo.create).not.toHaveBeenCalled()
    })

    it('still allows getMessages when disabled', async () => {
      process.env.TAVERN_DISABLED = '1'
      messageRepo.findRecent.mockResolvedValue([])
      await expect(service.getMessages({})).resolves.toEqual([])
    })
  })

  describe('deleteMessage', () => {
    it('deletes message via author-scoped repo update', async () => {
      messageRepo.softDeleteByPublicIdAndAuthor.mockResolvedValue(1)
      await service.deleteMessage(MSG_PUB, 'u1')
      expect(messageRepo.softDeleteByPublicIdAndAuthor).toHaveBeenCalledWith(MSG_PUB, 'u1')
    })

    it('throws NOT_FOUND when author check fails', async () => {
      messageRepo.softDeleteByPublicIdAndAuthor.mockResolvedValue(0)
      await expect(service.deleteMessage(MSG_PUB, 'u2')).rejects.toMatchObject({ code: 'NOT_FOUND' })
    })
  })

  describe('reportMessage', () => {
    it('inserts a report and increments reportCount in one transaction', async () => {
      txTavernMessage.findFirst.mockResolvedValue({ id: BigInt(1), userId: 'author' })
      await service.reportMessage(MSG_PUB, 'reporter')
      expect(txTavernMessage.findFirst).toHaveBeenCalledWith({
        where: { publicId: MSG_PUB, deletedAt: null },
        select: { id: true, userId: true }
      })
      expect(txTavernReport.create).toHaveBeenCalledWith({
        data: { messageId: BigInt(1), reporterId: 'reporter' }
      })
      expect(txTavernMessage.updateMany).toHaveBeenCalledWith({
        where: { id: BigInt(1), deletedAt: null },
        data: { reportCount: { increment: 1 } }
      })
    })

    it('refuses self-reports', async () => {
      txTavernMessage.findFirst.mockResolvedValue({ id: BigInt(1), userId: 'u1' })
      await expect(service.reportMessage(MSG_PUB, 'u1')).rejects.toMatchObject({ code: 'BAD_REQUEST' })
      expect(txTavernReport.create).not.toHaveBeenCalled()
    })

    it('throws NOT_FOUND when message is missing or soft-deleted', async () => {
      txTavernMessage.findFirst.mockResolvedValue(null)
      await expect(service.reportMessage(MSG_PUB, 'reporter')).rejects.toMatchObject({ code: 'NOT_FOUND' })
      expect(txTavernReport.create).not.toHaveBeenCalled()
    })

    it('throws NOT_FOUND when the message is deleted between insert and increment', async () => {
      txTavernMessage.findFirst.mockResolvedValue({ id: BigInt(1), userId: 'author' })
      txTavernMessage.updateMany.mockResolvedValue({ count: 0 })
      await expect(service.reportMessage(MSG_PUB, 'reporter')).rejects.toMatchObject({ code: 'NOT_FOUND' })
    })

    it('throws BAD_REQUEST on duplicate report (unique constraint)', async () => {
      prisma.$transaction.mockImplementation(async () => {
        const err = new Error('Unique constraint') as Error & { code: string }
        err.code = 'P2002'
        throw err
      })
      await expect(service.reportMessage(MSG_PUB, 'reporter')).rejects.toMatchObject({
        code: 'BAD_REQUEST'
      })
    })
  })
})
