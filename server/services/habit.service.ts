import type { CreateHabitType, UpdateHabitType } from '@shared/schemas/habits.schemas'
import { TRPCError } from '@trpc/server'
import type { PrismaClient } from '../generated/prisma'
import { HabitRepository } from '../repositories/habit.repository'
import { DiceService } from './dice.service'

export class HabitService {
  private diceService: DiceService
  private habitRepository: HabitRepository

  constructor(prisma: PrismaClient) {
    this.diceService = new DiceService(prisma)
    this.habitRepository = new HabitRepository(prisma)
  }

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

    if (!habit || habit.userId !== userId) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Habit ${id} not found`
      })
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

    if (!completion || completion.userId !== userId) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Habit completion not found' })
    }

    await this.habitRepository.deleteCompletion(completionId)
    return { message: 'Habit completion deleted successfully' }
  }
}
