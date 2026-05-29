import type { Habit, HabitCompletion, PrismaClient } from '@/generated/prisma'
import type { CreateHabitType, UpdateHabitType } from '@shared/schemas/habits.schemas'
import { TRPCError } from '@trpc/server'
import { RESOURCE_NOT_FOUND_OR_FORBIDDEN } from '../lib/errors'
import { logger } from '../lib/logger'
import { generatePublicId } from '../lib/public-id'

const log = logger.child({ component: 'habit-repository' })

const HABIT_INCLUDE = {
  objectives: true,
  areas: true
}

const HABIT_WITH_COMPLETIONS_INCLUDE = {
  objectives: true,
  areas: true,
  completions: {
    orderBy: { completedAt: 'desc' as const }
  }
}

export class HabitRepository {
  constructor(private prisma: PrismaClient) {}

  async create(userId: string, input: CreateHabitType): Promise<Habit> {
    return this.prisma.habit.create({
      data: {
        publicId: generatePublicId(),
        name: input.name,
        ...(input.description && { description: input.description }),
        recurrence: input.recurrence,
        timespan: input.timespan,
        userId,
        objectives: {
          connect: input.objectives?.map((publicId) => ({ publicId })) || []
        },
        areas: {
          connect: input.areas?.map((publicId) => ({ publicId })) || []
        }
      },
      include: HABIT_INCLUDE
    })
  }

  async findByPublicId(publicId: string, userId: string): Promise<Habit | null> {
    const habit = await this.prisma.habit.findUnique({ where: { publicId } })
    if (!habit || habit.userId !== userId) return null
    return habit
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

  async findByIdOrThrow(id: bigint, userId: string): Promise<Habit> {
    const habit = await this.prisma.habit.findUnique({
      where: { id }
    })

    if (!habit) {
      throw new TRPCError({ code: 'NOT_FOUND', message: RESOURCE_NOT_FOUND_OR_FORBIDDEN })
    }
    if (habit.userId !== userId) {
      log.warn({ resourceId: id, requestingUserId: userId }, 'Unauthorized habit access attempt')
      throw new TRPCError({ code: 'NOT_FOUND', message: RESOURCE_NOT_FOUND_OR_FORBIDDEN })
    }

    return habit
  }

  async findByIdWithDetails(id: bigint): Promise<Habit | null> {
    return this.prisma.habit.findUnique({
      where: {
        id,
        deletedAt: null
      },
      include: {
        objectives: true,
        areas: true,
        completions: {
          orderBy: { completedAt: 'desc' },
          take: 20
        }
      }
    })
  }

  async update(id: bigint, input: UpdateHabitType): Promise<Habit> {
    return this.prisma.habit.update({
      where: { id },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.description && { description: input.description }),
        ...(input.recurrence && { recurrence: input.recurrence }),
        ...(input.timespan && { timespan: input.timespan }),
        objectives: {
          set: input.objectives?.map((publicId) => ({ publicId })) || []
        },
        areas: {
          set: input.areas?.map((publicId) => ({ publicId })) || []
        }
      },
      include: HABIT_INCLUDE
    })
  }

  async softDelete(id: bigint): Promise<void> {
    await this.prisma.habit.update({
      where: { id },
      data: { deletedAt: new Date() }
    })
  }

  async restore(id: bigint): Promise<Habit> {
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

  async createCompletion(habitId: bigint, userId: string): Promise<HabitCompletion> {
    return this.prisma.habitCompletion.create({
      data: { habitId, userId, publicId: generatePublicId() }
    })
  }

  async findCompletions(habitId: bigint, userId: string): Promise<HabitCompletion[]> {
    return this.prisma.habitCompletion.findMany({
      where: { habitId, userId }
    })
  }

  async findAllWithLastCompletion(
    userId: string
  ): Promise<Array<{ name: string; completions: { completedAt: Date }[] }>> {
    return this.prisma.habit.findMany({
      where: { userId, deletedAt: null },
      select: {
        name: true,
        completions: {
          orderBy: { completedAt: 'desc' },
          take: 1,
          select: { completedAt: true }
        }
      }
    })
  }

  async findCompletionsByDate(
    userId: string,
    after: Date
  ): Promise<Array<Habit & { completions: HabitCompletion[] }>> {
    return this.prisma.habit.findMany({
      where: { userId, deletedAt: null },
      include: {
        completions: {
          where: { completedAt: { gte: after } }
        }
      }
    })
  }

  async findCompletionsWithAreas(
    userId: string,
    after: Date
  ): Promise<
    Array<
      Habit & {
        objectives: Array<{ areas: Array<{ id: bigint }> }>
        completions: HabitCompletion[]
      }
    >
  > {
    return this.prisma.habit.findMany({
      where: { userId, deletedAt: null },
      include: {
        objectives: {
          include: {
            areas: true
          }
        },
        completions: {
          where: { completedAt: { gte: after } }
        }
      }
    })
  }

  async findCompletionByPublicId(publicId: string, userId: string): Promise<HabitCompletion | null> {
    const completion = await this.prisma.habitCompletion.findUnique({ where: { publicId } })
    if (!completion || completion.userId !== userId) return null
    return completion
  }

  async findCompletionById(id: bigint): Promise<HabitCompletion | null> {
    return this.prisma.habitCompletion.findUnique({
      where: { id }
    })
  }

  async deleteCompletion(id: bigint): Promise<void> {
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
