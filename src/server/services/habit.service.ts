import { CAMPAIGN_EVENT_TYPE } from '@/shared/constants/guild-campaigns.constants'
import type { CreateHabitType, UpdateHabitType } from '@shared/schemas/habits.schemas'
import { resourceNotFound } from '../lib/errors'
import { logger } from '../lib/logger'
import type { HabitRepository } from '../repositories/habit.repository'
import type { GuildService } from './guild.service'
import type { ManaService } from './mana.service'

const log = logger.child({ service: 'habit' })

export class HabitService {
  constructor(
    private habitRepository: HabitRepository,
    private manaService: ManaService,
    private guildService?: GuildService
  ) {}

  async create(userId: string, input: CreateHabitType) {
    const habit = await this.habitRepository.create(userId, input)
    return { habit }
  }

  async getAll(userId: string) {
    const habits = await this.habitRepository.findAll(userId)
    const withLastCompleted = habits.map((habit) => {
      const completions = (habit as typeof habit & { completions?: { completedAt: Date }[] }).completions ?? []
      const lastCompletedAt = completions[0]?.completedAt ?? null
      return { ...habit, lastCompletedAt }
    })
    return { habits: withLastCompleted }
  }

  async getById(userId: string, id: string) {
    const habit = await this.habitRepository.findByIdWithDetails(id)

    if (!habit) {
      log.warn({ habitId: id, userId }, 'getById: habit not found')
      throw resourceNotFound()
    }
    if (habit.userId !== userId) {
      log.warn({ habitId: id, requestingUserId: userId, ownerId: habit.userId }, 'getById: ownership check failed')
      throw resourceNotFound()
    }

    return { habit }
  }

  async update(userId: string, input: UpdateHabitType) {
    await this.habitRepository.findByIdOrThrow(input.id, userId)
    const habit = await this.habitRepository.update(input.id, input)
    return { habit }
  }

  async delete(userId: string, id: string) {
    await this.habitRepository.findByIdOrThrow(id, userId)
    await this.habitRepository.softDelete(id)
    return { message: 'Habit deleted successfully' }
  }

  async restore(userId: string, id: string) {
    await this.habitRepository.findByIdOrThrow(id, userId)
    const restoredHabit = await this.habitRepository.restore(id)
    return { habit: restoredHabit, message: 'Habit restored successfully' }
  }

  async getDeleted(userId: string) {
    const habits = await this.habitRepository.findDeleted(userId)
    return { habits }
  }

  async createCompletion(userId: string, habitId: string) {
    await this.habitRepository.findByIdOrThrow(habitId, userId)

    const completion = await this.habitRepository.createCompletion(habitId, userId)

    const completions = await this.habitRepository.findCompletions(habitId, userId)
    const streak = this.manaService.calculateHabitStreak(completions)

    const result = await this.manaService.addManaFromCompletion(userId, 'habit')

    await this.guildService?.recordCampaignEvent(userId, CAMPAIGN_EVENT_TYPE.HABIT_COMPLETION, 1)

    return {
      completion,
      manaEarned: result.manaApplied,
      reserveGained: result.reserveGained,
      streak
    }
  }

  async deleteCompletion(userId: string, completionId: string) {
    const completion = await this.habitRepository.findCompletionById(completionId)

    if (!completion) {
      log.warn({ completionId, userId }, 'deleteCompletion: completion not found')
      throw resourceNotFound()
    }
    if (completion.userId !== userId) {
      log.warn(
        { completionId, requestingUserId: userId, ownerId: completion.userId },
        'deleteCompletion: ownership check failed'
      )
      throw resourceNotFound()
    }

    await this.habitRepository.deleteCompletion(completionId)
    return { message: 'Habit completion deleted successfully' }
  }
}
