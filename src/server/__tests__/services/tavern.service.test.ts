import { TRPCError } from '@trpc/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TavernService } from '../../services/tavern.service'

describe('TavernService', () => {
  let service: TavernService
  let prisma: any
  let messageRepo: any
  let characterRepo: any
  let txTavernMessage: any
  let txTavernReport: any

  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.TAVERN_DISABLED

    txTavernMessage = {
      findFirst: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 1 })
    }
    txTavernReport = {
      create: vi.fn().mockResolvedValue({ id: 'rep-1' })
    }

    prisma = {
      $transaction: vi.fn(async (fn: any) =>
        fn({ tavernMessage: txTavernMessage, tavernMessageReport: txTavernReport })
      )
    }

    messageRepo = {
      findRecent: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      softDeleteByAuthor: vi.fn().mockResolvedValue(1)
    }

    characterRepo = {
      findByUserId: vi.fn().mockResolvedValue({ id: 'char-1', userId: 'u1' })
    }

    service = new TavernService(prisma, messageRepo, characterRepo)
  })

  describe('getMessages', () => {
    it('returns messages in chronological order (oldest first)', async () => {
      const desc = [
        { id: 'm3', createdAt: new Date('2026-01-03'), userId: 'u1' },
        { id: 'm2', createdAt: new Date('2026-01-02'), userId: 'u2' },
        { id: 'm1', createdAt: new Date('2026-01-01'), userId: 'u3' }
      ]
      messageRepo.findRecent.mockResolvedValue(desc)
      const result = await service.getMessages({})
      expect(result.map((m: any) => m.id)).toEqual(['m1', 'm2', 'm3'])
    })

    it('passes cursor and limit to the repository', async () => {
      const cursor = { createdAt: '2026-01-01T00:00:00.000Z', id: 'm-cursor' }
      await service.getMessages({ cursor, limit: 25 })
      expect(messageRepo.findRecent).toHaveBeenCalledWith({ cursor, limit: 25 })
    })
  })

  describe('sendMessage', () => {
    it('freezes characterId at send time', async () => {
      messageRepo.create.mockResolvedValue({ id: 'm1' })
      await service.sendMessage({ content: 'Hello' }, 'u1')
      expect(messageRepo.create).toHaveBeenCalledWith({
        userId: 'u1',
        characterId: 'char-1',
        content: 'Hello'
      })
    })

    it('trims content before storage', async () => {
      messageRepo.create.mockResolvedValue({ id: 'm1' })
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
      messageRepo.softDeleteByAuthor.mockResolvedValue(1)
      await service.deleteMessage('m1', 'u1')
      expect(messageRepo.softDeleteByAuthor).toHaveBeenCalledWith('m1', 'u1')
    })

    it('throws NOT_FOUND when author check fails', async () => {
      messageRepo.softDeleteByAuthor.mockResolvedValue(0)
      await expect(service.deleteMessage('m1', 'u2')).rejects.toMatchObject({ code: 'NOT_FOUND' })
    })
  })

  describe('reportMessage', () => {
    it('inserts a report and increments reportCount in one transaction', async () => {
      txTavernMessage.findFirst.mockResolvedValue({ userId: 'author' })
      await service.reportMessage('m1', 'reporter')
      expect(txTavernMessage.findFirst).toHaveBeenCalledWith({
        where: { id: 'm1', deletedAt: null },
        select: { userId: true }
      })
      expect(txTavernReport.create).toHaveBeenCalledWith({
        data: { messageId: 'm1', reporterId: 'reporter' }
      })
      expect(txTavernMessage.updateMany).toHaveBeenCalledWith({
        where: { id: 'm1', deletedAt: null },
        data: { reportCount: { increment: 1 } }
      })
    })

    it('refuses self-reports', async () => {
      txTavernMessage.findFirst.mockResolvedValue({ userId: 'u1' })
      await expect(service.reportMessage('m1', 'u1')).rejects.toMatchObject({ code: 'BAD_REQUEST' })
      expect(txTavernReport.create).not.toHaveBeenCalled()
    })

    it('throws NOT_FOUND when message is missing or soft-deleted', async () => {
      txTavernMessage.findFirst.mockResolvedValue(null)
      await expect(service.reportMessage('m1', 'reporter')).rejects.toMatchObject({ code: 'NOT_FOUND' })
      expect(txTavernReport.create).not.toHaveBeenCalled()
    })

    it('throws NOT_FOUND when the message is deleted between insert and increment', async () => {
      txTavernMessage.findFirst.mockResolvedValue({ userId: 'author' })
      txTavernMessage.updateMany.mockResolvedValue({ count: 0 })
      await expect(service.reportMessage('m1', 'reporter')).rejects.toMatchObject({ code: 'NOT_FOUND' })
    })

    it('throws BAD_REQUEST on duplicate report (unique constraint)', async () => {
      prisma.$transaction.mockImplementation(async () => {
        const err = new Error('Unique constraint') as Error & { code: string }
        err.code = 'P2002'
        throw err
      })
      await expect(service.reportMessage('m1', 'reporter')).rejects.toMatchObject({
        code: 'BAD_REQUEST'
      })
    })
  })
})
