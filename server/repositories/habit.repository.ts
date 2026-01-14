import type { CreateHabitType, UpdateHabitType } from '@shared/schemas/habits.schemas'
import { TRPCError } from '@trpc/server'
import type { Habit, HabitCompletion, PrismaClient } from '../generated/prisma'

const HABIT_INCLUDE = {
  objectives: true
}

const HABIT_WITH_COMPLETIONS_INCLUDE = {
  objectives: true,
  completions: {
    orderBy: { completedAt: 'desc' as const }
  }
}

export class HabitRepository {
  constructor(private prisma: PrismaClient) {}

  async create(userId: string, input: CreateHabitType): Promise<Habit> {
    return this.prisma.habit.create({
      data: {
        name: input.name,
        ...(input.description && { description: input.description }),
        recurrence: input.recurrence,
        timespan: input.timespan,
        userId,
        objectives: {
          connect: input.objectives?.map((objectiveId) => ({ id: objectiveId })) || []
        }
      },
      include: HABIT_INCLUDE
    })
  }

  async findAll(userId: string): Promise<Habit[]> {
    return this.prisma.habit.findMany({
      where: {
        userId,
        deletedAt: null
      },
      include: HABIT_WITH_COMPLETIONS_INCLUDE,
      orderBy: { createdAt: 'desc' }
    })
  }

  async findByIdOrThrow(id: string, userId: string): Promise<Habit> {
    const habit = await this.prisma.habit.findUnique({
      where: { id }
    })

    if (!habit || habit.userId !== userId) {
      throw new TRPCError({ code: 'NOT_FOUND', message: `Habit ${id} not found` })
    }

    return habit
  }

  async findByIdWithDetails(id: string): Promise<Habit | null> {
    return this.prisma.habit.findUnique({
      where: {
        id,
        deletedAt: null
      },
      include: {
        objectives: true,
        completions: {
          orderBy: { completedAt: 'desc' },
          take: 20
        }
      }
    })
  }

  async update(id: string, input: UpdateHabitType): Promise<Habit> {
    return this.prisma.habit.update({
      where: { id: input.id },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.description && { description: input.description }),
        ...(input.recurrence && { recurrence: input.recurrence }),
        ...(input.timespan && { timespan: input.timespan }),
        objectives: {
          set: input.objectives?.map((objectiveId) => ({ id: objectiveId })) || []
        }
      },
      include: HABIT_INCLUDE
    })
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.habit.update({
      where: { id },
      data: { deletedAt: new Date() }
    })
  }

  async restore(id: string): Promise<Habit> {
    return this.prisma.habit.update({
      where: { id },
      data: { deletedAt: null },
      include: HABIT_INCLUDE
    })
  }

  async findDeleted(userId: string): Promise<Habit[]> {
    return this.prisma.habit.findMany({
      where: {
        userId,
        deletedAt: { not: null }
      },
      include: HABIT_INCLUDE,
      orderBy: { deletedAt: 'desc' }
    })
  }

  async deleteManyByUserId(userId: string): Promise<void> {
    await this.prisma.habit.deleteMany({
      where: { userId }
    })
  }

  async createCompletion(habitId: string, userId: string): Promise<HabitCompletion> {
    return this.prisma.habitCompletion.create({
      data: { habitId, userId }
    })
  }

  async findCompletions(habitId: string, userId: string): Promise<HabitCompletion[]> {
    return this.prisma.habitCompletion.findMany({
      where: { habitId, userId }
    })
  }

  async findCompletionsByDate(userId: string, after: Date): Promise<Habit[]> {
    return this.prisma.habit.findMany({
      where: { userId, deletedAt: null },
      include: {
        completions: {
          where: { completedAt: { gte: after } }
        }
      }
    })
  }

  async findCompletionById(id: string): Promise<HabitCompletion | null> {
    return this.prisma.habitCompletion.findUnique({
      where: { id }
    })
  }

  async deleteCompletion(id: string): Promise<void> {
    await this.prisma.habitCompletion.delete({
      where: { id }
    })
  }

  async deleteCompletionsByUserId(userId: string): Promise<void> {
    await this.prisma.habitCompletion.deleteMany({
      where: { userId }
    })
  }
}
