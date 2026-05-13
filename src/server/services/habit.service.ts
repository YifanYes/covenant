import type { CreateHabitType, UpdateHabitType } from '@shared/schemas/habits.schemas'
import { TRPCError } from '@trpc/server'
import { RESOURCE_NOT_FOUND_OR_FORBIDDEN } from '../lib/errors'
import type { HabitRepository } from '../repositories/habit.repository'
import { logger } from '../lib/logger'
import type { ManaService } from './mana.service'

const log = logger.child({ service: 'habit' })

export class HabitService {
  constructor(
    private habitRepository: HabitRepository,
    private manaService: ManaService
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
      throw new TRPCError({ code: 'NOT_FOUND', message: RESOURCE_NOT_FOUND_OR_FORBIDDEN })
    }
    if (habit.userId !== userId) {
      log.warn({ resourceId: id, requestingUserId: userId }, 'Unauthorized habit access attempt')
      throw new TRPCError({ code: 'NOT_FOUND', message: RESOURCE_NOT_FOUND_OR_FORBIDDEN })
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
      throw new TRPCError({ code: 'NOT_FOUND', message: RESOURCE_NOT_FOUND_OR_FORBIDDEN })
    }
    if (completion.userId !== userId) {
      log.warn({ resourceId: completionId, requestingUserId: userId }, 'Unauthorized habit completion access attempt')
      throw new TRPCError({ code: 'NOT_FOUND', message: RESOURCE_NOT_FOUND_OR_FORBIDDEN })
    }

    await this.habitRepository.deleteCompletion(completionId)
    return { message: 'Habit completion deleted successfully' }
  }
}
