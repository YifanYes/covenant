import { CAMPAIGN_EVENT_TYPE } from '@/shared/constants/guild-campaigns.constants'
import { MANA_REWARDS } from '@/shared/constants/rewards.constants'
import type { CreateHabitType, UpdateHabitType } from '@shared/schemas/habits.schemas'
import { TRPCError } from '@trpc/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { HabitRepository } from '../../repositories/habit.repository'
import type { GuildService } from '../../services/guild.service'
import { HabitService } from '../../services/habit.service'
import type { ManaService } from '../../services/mana.service'
import { createRepoMock } from '../helpers/mock-repo'

const HABIT_PUB = 'habit1234567'
const COMPLETION_PUB = 'cmpltn123456'

describe('HabitService', () => {
  let habitService: HabitService
  let mockHabitRepo: ReturnType<typeof createRepoMock<HabitRepository>>
  let mockManaService: ReturnType<typeof createRepoMock<ManaService>>
  let mockGuildService: ReturnType<typeof createRepoMock<GuildService>>

  beforeEach(() => {
    vi.clearAllMocks()

    mockHabitRepo = createRepoMock<HabitRepository>()

    mockManaService = createRepoMock<ManaService>()
    mockManaService.addManaFromCompletion.mockResolvedValue({
      success: true,
      amount: MANA_REWARDS.HABIT,
      manaApplied: MANA_REWARDS.HABIT,
      reserveGained: 0,
      newMana: MANA_REWARDS.HABIT,
      newReserve: 0
    })
    mockManaService.calculateHabitStreak.mockReturnValue(5)

    mockGuildService = createRepoMock<GuildService>()
    mockGuildService.recordCampaignEvent.mockResolvedValue(undefined)

    habitService = new HabitService(mockHabitRepo, mockManaService, mockGuildService)
  })

  describe('create', () => {
    it('creates habit', async () => {
      const input = { name: 'Read', recurrence: 'DAILY', timespan: 'MORNING' } as unknown as CreateHabitType
      mockHabitRepo.create.mockResolvedValue({ id: BigInt(1), publicId: HABIT_PUB, ...input })

      const result = await habitService.create('user-1', input)

      expect(result.habit).toEqual({ id: BigInt(1), publicId: HABIT_PUB, ...input })
      expect(mockHabitRepo.create).toHaveBeenCalledWith('user-1', input)
    })
  })

  describe('getAll', () => {
    it('decorates habits with lastCompletedAt from completions[0]', async () => {
      const completedAt = new Date('2026-01-15')
      mockHabitRepo.findAll.mockResolvedValue([
        { id: BigInt(1), publicId: HABIT_PUB, completions: [{ completedAt }] },
        { id: BigInt(2), publicId: 'aaaaaaaaaaaa', completions: [] },
        { id: BigInt(3), publicId: 'bbbbbbbbbbbb' }
      ])

      const { habits } = await habitService.getAll('user-1')

      expect(habits[0].lastCompletedAt).toBe(completedAt)
      expect(habits[1].lastCompletedAt).toBeNull()
      expect(habits[2].lastCompletedAt).toBeNull()
    })
  })

  describe('getById', () => {
    it('returns habit when user owns', async () => {
      mockHabitRepo.findByPublicId.mockResolvedValue({ id: BigInt(1), publicId: HABIT_PUB, userId: 'user-1' })
      mockHabitRepo.findByIdWithDetails.mockResolvedValue({ id: BigInt(1), publicId: HABIT_PUB, userId: 'user-1' })
      const result = await habitService.getById('user-1', HABIT_PUB)
      expect(result.habit).toEqual({ id: BigInt(1), publicId: HABIT_PUB, userId: 'user-1' })
    })

    it('throws NOT_FOUND when habit missing', async () => {
      mockHabitRepo.findByPublicId.mockResolvedValue(null)
      await expect(habitService.getById('user-1', HABIT_PUB)).rejects.toThrow(TRPCError)
    })
  })

  describe('update', () => {
    it('resolves publicId then updates', async () => {
      mockHabitRepo.findByPublicId.mockResolvedValue({ id: BigInt(1), publicId: HABIT_PUB, userId: 'user-1' })
      mockHabitRepo.update.mockResolvedValue({ id: BigInt(1), publicId: HABIT_PUB, name: 'New' })

      const result = await habitService.update('user-1', { publicId: HABIT_PUB, name: 'New' } as unknown as UpdateHabitType)

      expect(mockHabitRepo.findByPublicId).toHaveBeenCalledWith(HABIT_PUB, 'user-1')
      expect(mockHabitRepo.update).toHaveBeenCalledWith(BigInt(1), { publicId: HABIT_PUB, name: 'New' })
      expect(result.habit).toEqual({ id: BigInt(1), publicId: HABIT_PUB, name: 'New' })
    })

    it('throws NOT_FOUND if publicId resolves nothing', async () => {
      mockHabitRepo.findByPublicId.mockResolvedValue(null)
      await expect(
        habitService.update('user-1', { publicId: HABIT_PUB, name: 'New' } as unknown as UpdateHabitType)
      ).rejects.toThrow(TRPCError)
    })
  })

  describe('delete / restore / getDeleted', () => {
    it('soft-deletes after publicId resolves', async () => {
      mockHabitRepo.findByPublicId.mockResolvedValue({ id: BigInt(1), publicId: HABIT_PUB })
      await habitService.delete('user-1', HABIT_PUB)
      expect(mockHabitRepo.findByPublicId).toHaveBeenCalledWith(HABIT_PUB, 'user-1')
      expect(mockHabitRepo.softDelete).toHaveBeenCalledWith(BigInt(1))
    })

    it('restores after publicId resolves', async () => {
      mockHabitRepo.findByPublicId.mockResolvedValue({ id: BigInt(1), publicId: HABIT_PUB })
      mockHabitRepo.restore.mockResolvedValue({ id: BigInt(1), publicId: HABIT_PUB })
      const result = await habitService.restore('user-1', HABIT_PUB)
      expect(mockHabitRepo.restore).toHaveBeenCalledWith(BigInt(1))
      expect(result.habit).toEqual({ id: BigInt(1), publicId: HABIT_PUB })
    })

    it('lists deleted habits', async () => {
      mockHabitRepo.findDeleted.mockResolvedValue([{ id: BigInt(1), publicId: HABIT_PUB }])
      const { habits } = await habitService.getDeleted('user-1')
      expect(habits).toEqual([{ id: BigInt(1), publicId: HABIT_PUB }])
    })
  })

  describe('createCompletion', () => {
    it('grants mana, computes streak, records guild event', async () => {
      mockHabitRepo.findByPublicId.mockResolvedValue({ id: BigInt(1), publicId: HABIT_PUB })
      mockHabitRepo.createCompletion.mockResolvedValue({ id: BigInt(100), publicId: COMPLETION_PUB })
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

      const result = await habitService.createCompletion('user-1', HABIT_PUB)

      expect(result.completion).toEqual({ id: BigInt(100), publicId: COMPLETION_PUB })
      expect(result.manaEarned).toBe(MANA_REWARDS.HABIT)
      expect(result.reserveGained).toBe(3)
      expect(result.streak).toBe(7)
      expect(mockGuildService.recordCampaignEvent).toHaveBeenCalledWith(
        'user-1',
        CAMPAIGN_EVENT_TYPE.HABIT_COMPLETION,
        1
      )
    })

    it('completes end-to-end when guildService undefined', async () => {
      const svc = new HabitService(mockHabitRepo, mockManaService)
      mockHabitRepo.findByPublicId.mockResolvedValue({ id: BigInt(1), publicId: HABIT_PUB })
      mockHabitRepo.createCompletion.mockResolvedValue({ id: BigInt(100), publicId: COMPLETION_PUB })
      mockHabitRepo.findCompletions.mockResolvedValue([])

      const result = await svc.createCompletion('user-1', HABIT_PUB)

      expect(result.completion).toEqual({ id: BigInt(100), publicId: COMPLETION_PUB })
      expect(result.manaEarned).toBe(MANA_REWARDS.HABIT)
    })

    it('rejects when habit not found', async () => {
      mockHabitRepo.findByPublicId.mockResolvedValue(null)
      await expect(habitService.createCompletion('user-1', HABIT_PUB)).rejects.toThrow(TRPCError)
      expect(mockHabitRepo.createCompletion).not.toHaveBeenCalled()
    })
  })

  describe('deleteCompletion', () => {
    it('deletes when user owns completion', async () => {
      mockHabitRepo.findCompletionByPublicId.mockResolvedValue({ id: BigInt(100), publicId: COMPLETION_PUB, userId: 'user-1' })
      await habitService.deleteCompletion('user-1', COMPLETION_PUB)
      expect(mockHabitRepo.deleteCompletion).toHaveBeenCalledWith(BigInt(100))
    })

    it('throws NOT_FOUND when completion missing or unauthorized', async () => {
      mockHabitRepo.findCompletionByPublicId.mockResolvedValue(null)
      await expect(habitService.deleteCompletion('user-1', COMPLETION_PUB)).rejects.toThrow(TRPCError)
      expect(mockHabitRepo.deleteCompletion).not.toHaveBeenCalled()
    })
  })
})
