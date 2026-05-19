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
      mockJournalRepo.create.mockResolvedValue({ id: 'entry-1', content: 'Hello', mood: 'happy', color: '#FFD700' })
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

      expect(result.entry).toEqual({ id: 'entry-1', content: 'Hello', mood: 'happy', color: '#FFD700' })
      expect(result.manaEarned).toBe(1)
      expect(result.streak).toBe(3)
      expect(mockManaService.addManaFromCompletion).toHaveBeenCalledWith('user-1', 'journal')
      expect(mockJournalRepo.findEntryDates).toHaveBeenCalledWith('user-1', 1000)
      expect(mockManaService.calculateStreakFromDates).toHaveBeenCalledWith(expect.any(Array), 0)
    })

    it('should not award mana when grant fails', async () => {
      mockJournalRepo.create.mockResolvedValue({ id: 'entry-1', content: 'Hello' })
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

    it('should sanitize HTML content before writing', async () => {
      mockJournalRepo.create.mockResolvedValue({ id: 'entry-1', content: '<p>safe</p>' })
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
      const existingEntry = { id: 'entry-existing', content: 'Existing', mood: 'calm', color: '#5F9EA0' }
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
  })

  describe('update', () => {
    it('should update an entry', async () => {
      mockJournalRepo.update.mockResolvedValue({ id: 'entry-1', content: 'New', mood: 'calm', color: '#5F9EA0' })

      const result = await journalService.update('user-1', { id: 'entry-1', content: 'New', mood: 'calm', color: '#5F9EA0' })

      expect(result.content).toBe('New')
      expect(result.mood).toBe('calm')
      expect(result.color).toBe('#5F9EA0')
      expect(mockJournalRepo.findByIdOrThrow).not.toHaveBeenCalled()
    })

    it('should sanitize HTML content before writing', async () => {
      mockJournalRepo.update.mockResolvedValue({ id: 'entry-1', content: '<p>safe</p>' })

      await journalService.update('user-1', {
        id: 'entry-1',
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
      mockJournalRepo.findByIdOrThrow.mockResolvedValue({ id: 'entry-1' })
      mockJournalRepo.softDelete.mockResolvedValue(undefined)

      await journalService.delete('user-1', 'entry-1')

      expect(mockJournalRepo.findByIdOrThrow).toHaveBeenCalledWith('entry-1', 'user-1')
      expect(mockJournalRepo.softDelete).toHaveBeenCalledWith('entry-1', 'user-1')
    })
  })

  describe('getById', () => {
    it('should return an entry by id', async () => {
      mockJournalRepo.findById.mockResolvedValue({ id: 'entry-1', content: 'Hello' })

      const result = await journalService.getById('user-1', 'entry-1')

      expect(result).toEqual({ id: 'entry-1', content: 'Hello' })
    })

    it('should throw NOT_FOUND when entry does not exist', async () => {
      mockJournalRepo.findById.mockResolvedValue(null)

      await expect(journalService.getById('user-1', 'entry-1')).rejects.toThrow('Resource not found or access denied')
    })
  })

  describe('getByDate', () => {
    it('should return entries for a specific date', async () => {
      const dateStr = '2024-01-15'
      mockJournalRepo.findByDate.mockResolvedValue([
        { id: 'entry-1', content: 'Hello' },
        { id: 'entry-2', content: 'World' }
      ])

      const result = await journalService.getByDate('user-1', dateStr)

      expect(result).toEqual([
        { id: 'entry-1', content: 'Hello' },
        { id: 'entry-2', content: 'World' }
      ])
      expect(mockJournalRepo.findByDate).toHaveBeenCalledWith('user-1', dateStr, 0)
    })

    it('should throw BAD_REQUEST for invalid date format', async () => {
      await expect(journalService.getByDate('user-1', 'not-a-date')).rejects.toThrow('Invalid date format')
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
