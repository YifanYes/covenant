import { CAMPAIGN_EVENT_TYPE } from '@/shared/constants/guild-campaigns.constants'
import { MANA_REWARDS } from '@/shared/constants/rewards.constants'
import { TRPCError } from '@trpc/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HabitService } from '../../services/habit.service'

describe('HabitService', () => {
  let habitService: HabitService
  let mockHabitRepo: any
  let mockManaService: any
  let mockGuildService: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockHabitRepo = {
      create: vi.fn(),
      findAll: vi.fn(),
      findByIdOrThrow: vi.fn(),
      findByIdWithDetails: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
      restore: vi.fn(),
      findDeleted: vi.fn(),
      createCompletion: vi.fn(),
      findCompletions: vi.fn(),
      findCompletionById: vi.fn(),
      deleteCompletion: vi.fn()
    }

    mockManaService = {
      addManaFromCompletion: vi.fn().mockResolvedValue({
        success: true,
        amount: MANA_REWARDS.HABIT,
        manaApplied: MANA_REWARDS.HABIT,
        reserveGained: 0,
        newMana: MANA_REWARDS.HABIT,
        newReserve: 0
      }),
      calculateHabitStreak: vi.fn().mockReturnValue(5)
    }

    mockGuildService = {
      recordCampaignEvent: vi.fn().mockResolvedValue(undefined)
    }

    habitService = new HabitService(mockHabitRepo, mockManaService, mockGuildService)
  })

  describe('create', () => {
    it('creates habit', async () => {
      const input = { name: 'Read', recurrence: 'DAILY', timespan: 'MORNING' } as any
      mockHabitRepo.create.mockResolvedValue({ id: 'h-1', ...input })

      const result = await habitService.create('user-1', input)

      expect(result.habit).toEqual({ id: 'h-1', ...input })
      expect(mockHabitRepo.create).toHaveBeenCalledWith('user-1', input)
    })
  })

  describe('getAll', () => {
    it('decorates habits with lastCompletedAt from completions[0]', async () => {
      const completedAt = new Date('2026-01-15')
      mockHabitRepo.findAll.mockResolvedValue([
        { id: 'h-1', completions: [{ completedAt }] },
        { id: 'h-2', completions: [] },
        { id: 'h-3' }
      ])

      const { habits } = await habitService.getAll('user-1')

      expect(habits[0].lastCompletedAt).toBe(completedAt)
      expect(habits[1].lastCompletedAt).toBeNull()
      expect(habits[2].lastCompletedAt).toBeNull()
    })
  })

  describe('getById', () => {
    it('returns habit when user owns', async () => {
      mockHabitRepo.findByIdWithDetails.mockResolvedValue({ id: 'h-1', userId: 'user-1' })
      const result = await habitService.getById('user-1', 'h-1')
      expect(result.habit).toEqual({ id: 'h-1', userId: 'user-1' })
    })

    it('throws NOT_FOUND when habit missing', async () => {
      mockHabitRepo.findByIdWithDetails.mockResolvedValue(null)
      await expect(habitService.getById('user-1', 'h-1')).rejects.toThrow(TRPCError)
    })

    it('throws NOT_FOUND when habit owned by another user', async () => {
      mockHabitRepo.findByIdWithDetails.mockResolvedValue({ id: 'h-1', userId: 'user-2' })
      await expect(habitService.getById('user-1', 'h-1')).rejects.toThrow(TRPCError)
    })
  })

  describe('update', () => {
    it('verifies ownership before update', async () => {
      mockHabitRepo.findByIdOrThrow.mockResolvedValue({ id: 'h-1', userId: 'user-1' })
      mockHabitRepo.update.mockResolvedValue({ id: 'h-1', name: 'New' })

      const result = await habitService.update('user-1', { id: 'h-1', name: 'New' } as any)

      expect(mockHabitRepo.findByIdOrThrow).toHaveBeenCalledWith('h-1', 'user-1')
      expect(result.habit).toEqual({ id: 'h-1', name: 'New' })
    })
  })

  describe('delete / restore / getDeleted', () => {
    it('soft-deletes after ownership check', async () => {
      mockHabitRepo.findByIdOrThrow.mockResolvedValue({ id: 'h-1' })
      await habitService.delete('user-1', 'h-1')
      expect(mockHabitRepo.findByIdOrThrow).toHaveBeenCalledWith('h-1', 'user-1')
      expect(mockHabitRepo.softDelete).toHaveBeenCalledWith('h-1')
    })

    it('restores after ownership check', async () => {
      mockHabitRepo.findByIdOrThrow.mockResolvedValue({ id: 'h-1' })
      mockHabitRepo.restore.mockResolvedValue({ id: 'h-1' })
      const result = await habitService.restore('user-1', 'h-1')
      expect(mockHabitRepo.restore).toHaveBeenCalledWith('h-1')
      expect(result.habit).toEqual({ id: 'h-1' })
    })

    it('lists deleted habits', async () => {
      mockHabitRepo.findDeleted.mockResolvedValue([{ id: 'h-1' }])
      const { habits } = await habitService.getDeleted('user-1')
      expect(habits).toEqual([{ id: 'h-1' }])
    })
  })

  describe('createCompletion', () => {
    it('grants mana, computes streak, records guild event', async () => {
      mockHabitRepo.findByIdOrThrow.mockResolvedValue({ id: 'h-1' })
      mockHabitRepo.createCompletion.mockResolvedValue({ id: 'c-1' })
      mockHabitRepo.findCompletions.mockResolvedValue([{ completedAt: new Date() }])
      mockManaService.calculateHabitStreak.mockReturnValue(7)
      mockManaService.addManaFromCompletion.mockResolvedValue({
        success: true,
        amount: MANA_REWARDS.HABIT,
        manaApplied: MANA_REWARDS.HABIT,
        reserveGained: 3,
        newMana: 50,
        newReserve: 3
      })

      const result = await habitService.createCompletion('user-1', 'h-1')

      expect(result.completion).toEqual({ id: 'c-1' })
      expect(result.manaEarned).toBe(MANA_REWARDS.HABIT)
      expect(result.reserveGained).toBe(3)
      expect(result.streak).toBe(7)
      expect(mockManaService.calculateHabitStreak).toHaveBeenCalledWith([{ completedAt: expect.any(Date) }])
      expect(mockManaService.addManaFromCompletion).toHaveBeenCalledWith('user-1', 'habit')
      expect(mockGuildService.recordCampaignEvent).toHaveBeenCalledWith(
        'user-1',
        CAMPAIGN_EVENT_TYPE.HABIT_COMPLETION,
        1
      )
    })

    it('completes end-to-end when guildService undefined', async () => {
      const svc = new HabitService(mockHabitRepo, mockManaService)
      mockHabitRepo.findByIdOrThrow.mockResolvedValue({ id: 'h-1' })
      mockHabitRepo.createCompletion.mockResolvedValue({ id: 'c-1' })
      mockHabitRepo.findCompletions.mockResolvedValue([])

      const result = await svc.createCompletion('user-1', 'h-1')

      expect(result.completion).toEqual({ id: 'c-1' })
      expect(result.manaEarned).toBe(MANA_REWARDS.HABIT)
    })

    it('rejects when ownership check fails', async () => {
      mockHabitRepo.findByIdOrThrow.mockRejectedValue(new TRPCError({ code: 'NOT_FOUND', message: 'x' }))
      await expect(habitService.createCompletion('user-1', 'h-1')).rejects.toThrow(TRPCError)
      expect(mockHabitRepo.createCompletion).not.toHaveBeenCalled()
    })
  })

  describe('deleteCompletion', () => {
    it('deletes when user owns completion', async () => {
      mockHabitRepo.findCompletionById.mockResolvedValue({ id: 'c-1', userId: 'user-1' })
      await habitService.deleteCompletion('user-1', 'c-1')
      expect(mockHabitRepo.deleteCompletion).toHaveBeenCalledWith('c-1')
    })

    it('throws NOT_FOUND when completion missing', async () => {
      mockHabitRepo.findCompletionById.mockResolvedValue(null)
      await expect(habitService.deleteCompletion('user-1', 'c-1')).rejects.toThrow(TRPCError)
    })

    it('throws NOT_FOUND when completion owned by another user', async () => {
      mockHabitRepo.findCompletionById.mockResolvedValue({ id: 'c-1', userId: 'user-2' })
      await expect(habitService.deleteCompletion('user-1', 'c-1')).rejects.toThrow(TRPCError)
      expect(mockHabitRepo.deleteCompletion).not.toHaveBeenCalled()
    })
  })
})
