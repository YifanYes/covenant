import { journalDateSchema } from '@shared/schemas/journal.schemas'
import { Prisma } from '@/generated/prisma'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { JournalRepository } from '../../repositories/journal.repository'
import { JournalService } from '../../services/journal.service'
import type { ManaService } from '../../services/mana.service'
import { createPrismaMock, createRepoMock } from '../helpers/mock-repo'

describe('JournalService', () => {
  let journalService: JournalService
  let mockPrisma: ReturnType<typeof createPrismaMock>
  let mockJournalRepo: ReturnType<typeof createRepoMock<JournalRepository>>
  let mockManaService: ReturnType<typeof createRepoMock<ManaService>>

  beforeEach(() => {
    vi.clearAllMocks()

    mockPrisma = createPrismaMock({})

    mockJournalRepo = createRepoMock<JournalRepository>()

    mockManaService = createRepoMock<ManaService>()
    mockManaService.addManaFromCompletion.mockResolvedValue({
      success: true,
      amount: 1,
      manaApplied: 1,
      reserveGained: 0,
      newMana: 1,
      newReserve: 0
    })
    mockManaService.calculateStreakFromDates.mockReturnValue(3)

    journalService = new JournalService(mockPrisma, mockJournalRepo, mockManaService)
  })

  describe('create', () => {
    it('should create entry and award mana on first entry of the day', async () => {
      mockJournalRepo.create.mockResolvedValue({ id: BigInt(1), content: 'Hello', mood: 'happy', color: '#FFD700' })
      mockJournalRepo.hasEntryToday.mockResolvedValue(false)
      mockJournalRepo.findEntryDates.mockResolvedValue([
        new Date(),
        new Date(Date.now() - 86400000),
        new Date(Date.now() - 172800000)
      ])

      const result = await journalService.create('user-1', {
        content: 'Hello',
        mood: 'happy',
        color: '#FFD700',
        timezoneOffset: 0
      })

      expect(result.entry).toEqual({ id: BigInt(1), content: 'Hello', mood: 'happy', color: '#FFD700' })
      expect(result.manaEarned).toBe(1)
      expect(result.streak).toBe(3)
      expect(mockManaService.addManaFromCompletion).toHaveBeenCalledWith('user-1', 'journal')
      expect(mockJournalRepo.findEntryDates).toHaveBeenCalledWith('user-1', 1000)
      expect(mockManaService.calculateStreakFromDates).toHaveBeenCalledWith(expect.any(Array), 0)
    })

    it('should not award mana when grant fails', async () => {
      mockJournalRepo.create.mockResolvedValue({ id: BigInt(1), content: 'Hello' })
      mockJournalRepo.findEntryDates.mockResolvedValue([new Date()])
      mockManaService.addManaFromCompletion.mockResolvedValue({ success: false, amount: 0, manaApplied: 0, reserveGained: 0, newMana: 0, newReserve: 0 })

      const result = await journalService.create('user-1', {
        content: 'Hello',
        mood: undefined,
        color: undefined,
        timezoneOffset: 0
      })

      expect(result.manaEarned).toBe(0)
      expect(mockManaService.addManaFromCompletion).toHaveBeenCalledWith('user-1', 'journal')
    })

    it('does not award mana for a second entry on the same day', async () => {
      // Today's entries use @default(now()) so they never trip the unique constraint;
      // hasEntryToday is the guard that keeps mana to one grant per local day.
      mockJournalRepo.create.mockResolvedValue({ id: BigInt(2), publicId: 'jrnpub000002', content: 'Again' })
      mockJournalRepo.hasEntryToday.mockResolvedValue(true)
      mockJournalRepo.findEntryDates.mockResolvedValue([new Date()])

      const result = await journalService.create('user-1', { content: 'Again', timezoneOffset: 0 })

      expect(result.manaEarned).toBe(0)
      expect(mockManaService.addManaFromCompletion).not.toHaveBeenCalled()
      // The entry is still written — multiple entries per day are allowed, only the reward is capped.
      expect(mockJournalRepo.create).toHaveBeenCalled()
    })

    it('should sanitize HTML content before writing', async () => {
      mockJournalRepo.create.mockResolvedValue({ id: BigInt(1), content: '<p>safe</p>' })
      mockJournalRepo.findEntryDates.mockResolvedValue([new Date()])

      await journalService.create('user-1', {
        content: '<p>safe</p><script>alert(1)</script><img src=x onerror=alert(1)>',
        mood: undefined,
        color: undefined,
        timezoneOffset: 0
      })

      const writtenContent = mockJournalRepo.create.mock.calls[0][1]
      expect(writtenContent).not.toContain('<script')
      expect(writtenContent).not.toContain('onerror')
      expect(writtenContent).not.toContain('<img')
      expect(writtenContent).toContain('<p>safe</p>')
    })

    it('should handle race condition when duplicate entry is created concurrently', async () => {
      const existingEntry = { id: BigInt(99), content: 'Existing', mood: 'calm', color: '#5F9EA0' }
      mockJournalRepo.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint', {
          code: 'P2002',
          clientVersion: 'test'
        })
      )
      mockJournalRepo.findByDate.mockResolvedValue([existingEntry])
      mockJournalRepo.findEntryDates.mockResolvedValue([new Date()])

      const result = await journalService.create('user-1', {
        content: 'New entry',
        mood: undefined,
        color: undefined,
        timezoneOffset: 0
      })

      expect(result.manaEarned).toBe(0)
      expect(result.entry).toEqual(existingEntry)
      expect(mockManaService.addManaFromCompletion).not.toHaveBeenCalled()
    })

    it('awards mana for a backdated entry and pins createdAt to local midnight', async () => {
      mockJournalRepo.create.mockResolvedValue({ id: BigInt(5), publicId: 'jrnpub000005', content: 'Past' })
      mockJournalRepo.findEntryDates.mockResolvedValue([new Date()])

      const result = await journalService.create('user-1', {
        content: 'Past',
        date: '2020-01-01',
        timezoneOffset: 0
      })

      expect(result.manaEarned).toBe(1)
      expect(mockManaService.addManaFromCompletion).toHaveBeenCalledWith('user-1', 'journal')
      // createdAt (5th positional arg) is pinned to the chosen day's local midnight.
      const createdAt = mockJournalRepo.create.mock.calls[0][4] as Date
      expect(createdAt).toBeInstanceOf(Date)
      expect(createdAt.toISOString()).toBe('2020-01-01T00:00:00.000Z')
    })

    it('rejects a future-dated entry', async () => {
      await expect(
        journalService.create('user-1', { content: 'Tomorrow', date: '2999-12-31', timezoneOffset: 0 })
      ).rejects.toThrow('Future journal entries are not allowed')
      expect(mockJournalRepo.create).not.toHaveBeenCalled()
    })
  })

  describe('update', () => {
    it('should update an entry', async () => {
      mockJournalRepo.findByPublicId.mockResolvedValue({ id: BigInt(1), publicId: 'jrnpub000001' })
      mockJournalRepo.update.mockResolvedValue({ id: BigInt(1), publicId: 'jrnpub000001', content: 'New', mood: 'calm', color: '#5F9EA0' })

      const result = await journalService.update('user-1', { publicId: 'jrnpub000001', content: 'New', mood: 'calm', color: '#5F9EA0' })

      expect(result.content).toBe('New')
      expect(result.mood).toBe('calm')
      expect(result.color).toBe('#5F9EA0')
    })

    it('should sanitize HTML content before writing', async () => {
      mockJournalRepo.findByPublicId.mockResolvedValue({ id: BigInt(1), publicId: 'jrnpub000001' })
      mockJournalRepo.update.mockResolvedValue({ id: BigInt(1), publicId: 'jrnpub000001', content: '<p>safe</p>' })

      await journalService.update('user-1', {
        publicId: 'jrnpub000001',
        content: '<p>safe</p><script>alert(1)</script>',
        mood: undefined,
        color: undefined
      })

      const writtenContent = mockJournalRepo.update.mock.calls[0][2]
      expect(writtenContent).not.toContain('<script')
      expect(writtenContent).toContain('<p>safe</p>')
    })
  })

  describe('delete', () => {
    it('should delete an entry', async () => {
      mockJournalRepo.findByPublicId.mockResolvedValue({ id: BigInt(1), publicId: 'jrnpub000001' })
      mockJournalRepo.softDelete.mockResolvedValue(undefined)

      await journalService.delete('user-1', 'jrnpub000001')

      expect(mockJournalRepo.softDelete).toHaveBeenCalledWith(BigInt(1), 'user-1')
    })
  })

  describe('getById', () => {
    it('should return an entry by publicId', async () => {
      mockJournalRepo.findByPublicId.mockResolvedValue({ id: BigInt(1), publicId: 'jrnpub000001', content: 'Hello' })

      const result = await journalService.getById('user-1', 'jrnpub000001')

      expect(result).toEqual({ id: BigInt(1), publicId: 'jrnpub000001', content: 'Hello' })
    })

    it('should throw NOT_FOUND when entry does not exist', async () => {
      mockJournalRepo.findByPublicId.mockResolvedValue(null)

      await expect(journalService.getById('user-1', 'jrnpub000001')).rejects.toThrow('Resource not found or access denied')
    })
  })

  describe('getByDate', () => {
    it('should return entries for a specific date', async () => {
      const dateStr = '2024-01-15'
      mockJournalRepo.findByDate.mockResolvedValue([
        { id: BigInt(1), content: 'Hello' },
        { id: BigInt(2), content: 'World' }
      ])

      const result = await journalService.getByDate('user-1', dateStr)

      expect(result).toEqual([
        { id: BigInt(1), content: 'Hello' },
        { id: BigInt(2), content: 'World' }
      ])
      expect(mockJournalRepo.findByDate).toHaveBeenCalledWith('user-1', dateStr, 0)
    })

    it('rejects malformed and impossible dates at the schema boundary', () => {
      expect(journalDateSchema.safeParse({ date: 'not-a-date' }).success).toBe(false)
      expect(journalDateSchema.safeParse({ date: '2020-13-45' }).success).toBe(false)
      expect(journalDateSchema.safeParse({ date: '2020-02-30' }).success).toBe(false)
      expect(journalDateSchema.safeParse({ date: '2024-01-15' }).success).toBe(true)
    })
  })

  describe('getMoodCalendar', () => {
    it('should return mood calendar days', async () => {
      mockJournalRepo.findMoodCalendar.mockResolvedValue([
        { date: '2024-01-01', mood: 'happy' },
        { date: '2024-01-02', mood: 'calm' }
      ])

      const result = await journalService.getMoodCalendar('user-1', 0, 2024)

      expect(result.days).toEqual([
        { date: '2024-01-01', mood: 'happy' },
        { date: '2024-01-02', mood: 'calm' }
      ])
      expect(mockJournalRepo.findMoodCalendar).toHaveBeenCalledWith(
        'user-1',
        expect.any(Date),
        expect.any(Date),
        0
      )
    })
  })

  describe('getStreak', () => {
    it('should return streak and hasEntryToday', async () => {
      mockJournalRepo.findEntryDates.mockResolvedValue([new Date()])
      mockJournalRepo.hasEntryToday.mockResolvedValue(true)

      const result = await journalService.getStreak('user-1')

      expect(result.streak).toBe(3)
      expect(result.hasEntryToday).toBe(true)
      expect(mockJournalRepo.findEntryDates).toHaveBeenCalledWith('user-1', 1000)
      expect(mockJournalRepo.hasEntryToday).toHaveBeenCalledWith('user-1', 0)
      expect(mockManaService.calculateStreakFromDates).toHaveBeenCalledWith(expect.any(Array), 0)
    })
  })
})
