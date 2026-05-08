import { beforeEach, describe, expect, it, vi } from 'vitest'
import { JournalService } from '../../services/journal.service'

describe('JournalService', () => {
  let journalService: JournalService
  let mockPrisma: any
  let mockJournalRepo: any
  let mockDiceService: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockPrisma = {
      $transaction: vi.fn(async (callback: any) => {
        const tx = {}
        return callback(tx)
      })
    }

    mockJournalRepo = {
      create: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
      findById: vi.fn(),
      findByIdOrThrow: vi.fn(),
      findByDate: vi.fn(),
      findAll: vi.fn(),
      findMoodCalendar: vi.fn(),
      findEntryDates: vi.fn(),
      hasEntryToday: vi.fn(),
      deleteManyByUserId: vi.fn()
    }

    mockDiceService = {
      addDiceToBank: vi.fn().mockResolvedValue({ success: true, earned: 1, total: 1 }),
      calculateStreakFromDates: vi.fn().mockReturnValue(3)
    }

    journalService = new JournalService(mockPrisma, mockJournalRepo, mockDiceService)
  })

  describe('create', () => {
    it('should create entry and award dice on first entry of the day', async () => {
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
      expect(result.diceEarned).toBe(1)
      expect(result.streak).toBe(3)
      expect(mockDiceService.addDiceToBank).toHaveBeenCalledWith('user-1', 1)
      expect(mockJournalRepo.findEntryDates).toHaveBeenCalledWith('user-1', 1000)
      expect(mockDiceService.calculateStreakFromDates).toHaveBeenCalledWith(expect.any(Array), 0)
    })

    it('should not award dice when dice service fails', async () => {
      mockJournalRepo.create.mockResolvedValue({ id: 'entry-1', content: 'Hello' })
      mockJournalRepo.findEntryDates.mockResolvedValue([new Date()])
      mockDiceService.addDiceToBank.mockResolvedValue({ success: false, earned: 0 })

      const result = await journalService.create('user-1', {
        content: 'Hello',
        mood: undefined,
        color: undefined,
        timezoneOffset: 0
      })

      expect(result.diceEarned).toBe(0)
      expect(mockDiceService.addDiceToBank).toHaveBeenCalledWith('user-1', 1)
    })

    it('should handle race condition when duplicate entry is created concurrently', async () => {
      const existingEntry = { id: 'entry-existing', content: 'Existing', mood: 'calm', color: '#5F9EA0' }
      mockJournalRepo.create.mockRejectedValue(Object.assign(new Error('Unique constraint'), { code: 'P2002' }))
      mockJournalRepo.findByDate.mockResolvedValue([existingEntry])
      mockJournalRepo.findEntryDates.mockResolvedValue([new Date()])

      const result = await journalService.create('user-1', {
        content: 'New entry',
        mood: undefined,
        color: undefined,
        timezoneOffset: 0
      })

      expect(result.diceEarned).toBe(0)
      expect(result.entry).toEqual(existingEntry)
      expect(mockDiceService.addDiceToBank).not.toHaveBeenCalled()
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
      expect(mockDiceService.calculateStreakFromDates).toHaveBeenCalledWith(expect.any(Array), 0)
    })
  })
})
