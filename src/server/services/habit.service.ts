import type { CreateHabitType, UpdateHabitType } from '@shared/schemas/habits.schemas'
import { TRPCError } from '@trpc/server'
import type { HabitRepository } from '../repositories/habit.repository'
import { logger } from '../lib/logger'
import type { DiceService } from './dice.service'

const log = logger.child({ service: 'habit' })

export class HabitService {
  constructor(
    private habitRepository: HabitRepository,
    private diceService: DiceService
  ) {}

  async create(userId: string, input: CreateHabitType) {
    const habit = await this.habitRepository.create(userId, input)
    return { habit }
  }

  async getAll(userId: string) {
    const habits = await this.habitRepository.findAll(userId)
    return { habits }
  }

  async getById(userId: string, id: string) {
    const habit = await this.habitRepository.findByIdWithDetails(id)

    if (!habit) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Resource not found or access denied' })
    }
    if (habit.userId !== userId) {
      log.warn({ resourceId: id, requestingUserId: userId }, 'Unauthorized habit access attempt')
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Resource not found or access denied' })
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
    const streak = this.diceService.calculateHabitStreak(completions)

    let diceToAward = 2
    if (streak >= 21) diceToAward += 3
    else if (streak >= 14) diceToAward += 2
    else if (streak >= 7) diceToAward += 1

    const result = await this.diceService.addDiceToBank(userId, diceToAward)

    return {
      completion,
      diceEarned: result.earned,
      streak
    }
  }

  async deleteCompletion(userId: string, completionId: string) {
    const completion = await this.habitRepository.findCompletionById(completionId)

    if (!completion) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Resource not found or access denied' })
    }
    if (completion.userId !== userId) {
      log.warn({ resourceId: completionId, requestingUserId: userId }, 'Unauthorized habit completion access attempt')
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Resource not found or access denied' })
    }

    await this.habitRepository.deleteCompletion(completionId)
    return { message: 'Habit completion deleted successfully' }
  }
}
