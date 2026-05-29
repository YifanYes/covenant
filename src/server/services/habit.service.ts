import { CAMPAIGN_EVENT_TYPE } from '@/shared/constants/guild-campaigns.constants'
import type { CreateHabitType, UpdateHabitType } from '@shared/schemas/habits.schemas'
import { TRPCError } from '@trpc/server'
import { analytics as defaultAnalytics, type AnalyticsService } from '../lib/analytics'
import { RESOURCE_NOT_FOUND_OR_FORBIDDEN, resourceNotFound } from '../lib/errors'
import { logger } from '../lib/logger'
import type { CharacterRepository } from '../repositories/character.repository'
import type { HabitRepository } from '../repositories/habit.repository'
import { evaluateLoopClosed } from '../utils/loop-closed.utils'
import type { GuildService } from './guild.service'
import type { ManaService } from './mana.service'

function streakTier(streak: number): number {
  if (streak >= 21) return 3
  if (streak >= 14) return 2
  if (streak >= 7) return 1
  return 0
}

const log = logger.child({ service: 'habit' })

export class HabitService {
  constructor(
    private habitRepository: HabitRepository,
    private manaService: ManaService,
    private guildService?: GuildService,
    private characterRepository?: CharacterRepository,
    private analytics: AnalyticsService = defaultAnalytics
  ) {}

  private async resolveHabit(publicId: string, userId: string): Promise<bigint> {
    const habit = await this.habitRepository.findByPublicId(publicId, userId)
    if (!habit) throw new TRPCError({ code: 'NOT_FOUND', message: RESOURCE_NOT_FOUND_OR_FORBIDDEN })
    return habit.id
  }

  async create(userId: string, input: CreateHabitType) {
    const habit = await this.habitRepository.create(userId, input)
    if (this.characterRepository) {
      try {
        await this.characterRepository.updateOnboardingProgress(userId, { habitCreated: true })
      } catch (err) {
        log.warn({ err, userId }, 'onboarding tick failed: habitCreated')
      }
    }
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

  async getById(userId: string, publicId: string) {
    const lookup = await this.habitRepository.findByPublicId(publicId, userId)
    if (!lookup) {
      log.warn({ habitPublicId: publicId, userId }, 'getById: habit not found')
      throw resourceNotFound()
    }
    const habit = await this.habitRepository.findByIdWithDetails(lookup.id)
    if (!habit) throw resourceNotFound()
    return { habit }
  }

  async update(userId: string, input: UpdateHabitType) {
    const id = await this.resolveHabit(input.publicId, userId)
    const habit = await this.habitRepository.update(id, input)
    return { habit }
  }

  async delete(userId: string, publicId: string) {
    const id = await this.resolveHabit(publicId, userId)
    await this.habitRepository.softDelete(id)
    return { message: 'Habit deleted successfully' }
  }

  async restore(userId: string, publicId: string) {
    const id = await this.resolveHabit(publicId, userId)
    const restoredHabit = await this.habitRepository.restore(id)
    return { habit: restoredHabit, message: 'Habit restored successfully' }
  }

  async getDeleted(userId: string) {
    const habits = await this.habitRepository.findDeleted(userId)
    return { habits }
  }

  async createCompletion(userId: string, habitPublicId: string) {
    const habitId = await this.resolveHabit(habitPublicId, userId)

    const completion = await this.habitRepository.createCompletion(habitId, userId)

    const completions = await this.habitRepository.findCompletions(habitId, userId)
    const streak = this.manaService.calculateHabitStreak(completions)

    const result = await this.manaService.addManaFromCompletion(userId, 'habit')

    await this.guildService?.recordCampaignEvent(userId, CAMPAIGN_EVENT_TYPE.HABIT_COMPLETION, 1)

    this.analytics.track(userId, 'habit_completed', {
      habit_id: habitId.toString(),
      streak_length: streak,
      streak_tier: streakTier(streak),
      mana_earned: result.manaApplied,
      reserve_gained: result.reserveGained
    })

    if (this.characterRepository) {
      await evaluateLoopClosed(userId, this.characterRepository, this.analytics)
    }

    return {
      completion,
      manaEarned: result.manaApplied,
      reserveGained: result.reserveGained,
      streak
    }
  }

  async deleteCompletion(userId: string, completionPublicId: string) {
    const completion = await this.habitRepository.findCompletionByPublicId(completionPublicId, userId)
    if (!completion) {
      log.warn({ completionPublicId, userId }, 'deleteCompletion: completion not found or unauthorized')
      throw resourceNotFound()
    }
    await this.habitRepository.deleteCompletion(completion.id)
    return { message: 'Habit completion deleted successfully' }
  }
}
