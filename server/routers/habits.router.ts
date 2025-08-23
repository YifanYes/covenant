import { TRPCError } from '@trpc/server'
import { createHabitSchema, habitCompletionIdSchema, habitIdSchema, updateHabitSchema } from '../schemas/habits.schemas'
import { getUserHabit, getUserHabitCompletion } from '../services/habits.services'
import { protectedProcedure, t } from '../trpc'

export const habitsRouter = t.router({
  create: protectedProcedure.input(createHabitSchema).mutation(async ({ ctx, input }) => {
    const habit = await ctx.prisma.habit.create({
      data: {
        name: input.name,
        ...(input.description && { description: input.description }),
        recurrence: input.recurrence,
        timespan: input.timespan,
        userId: ctx.user.id,
        objectives: {
          connect: input.objectives?.map((objectiveId) => ({ id: objectiveId })) || []
        }
      },
      include: {
        objectives: true
      }
    })

    return {
      habit
    }
  }),

  getAll: protectedProcedure.query(async ({ ctx }) => {
    const habits = await ctx.prisma.habit.findMany({
      where: {
        userId: ctx.user.id,
        deletedAt: null
      },
      include: {
        objectives: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return {
      habits
    }
  }),

  getById: protectedProcedure.input(habitIdSchema).query(async ({ ctx, input }) => {
    const habitWithDetails = await ctx.prisma.habit.findUnique({
      where: {
        id: input.id,
        deletedAt: null
      },
      include: {
        objectives: true,
        completions: {
          orderBy: {
            completedAt: 'desc'
          },
          take: 20
        }
      }
    })

    if (!habitWithDetails) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Habit not found'
      })
    }

    return {
      habit: habitWithDetails
    }
  }),

  update: protectedProcedure.input(updateHabitSchema).mutation(async ({ ctx, input }) => {
    await getUserHabit(ctx.prisma, input.id, ctx.user.id)

    const habit = await ctx.prisma.habit.update({
      where: {
        id: input.id
      },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.description && { description: input.description }),
        ...(input.recurrence && { recurrence: input.recurrence }),
        ...(input.timespan && { timespan: input.timespan }),
        objectives: {
          set: input.objectives?.map((objectiveId) => ({ id: objectiveId })) || []
        }
      },
      include: {
        objectives: true
      }
    })

    return {
      habit
    }
  }),

  delete: protectedProcedure.input(habitIdSchema).mutation(async ({ ctx, input }) => {
    await getUserHabit(ctx.prisma, input.id, ctx.user.id)

    await ctx.prisma.habit.update({
      where: {
        id: input.id
      },
      data: {
        deletedAt: new Date()
      }
    })

    return {
      message: 'Habit deleted successfully'
    }
  }),

  restore: protectedProcedure.input(habitIdSchema).mutation(async ({ ctx, input }) => {
    await getUserHabit(ctx.prisma, input.id, ctx.user.id)

    const restoredHabit = await ctx.prisma.habit.update({
      where: {
        id: input.id
      },
      data: {
        deletedAt: null
      },
      include: {
        objectives: true
      }
    })

    return {
      habit: restoredHabit,
      message: 'Habit restored successfully'
    }
  }),

  getDeleted: protectedProcedure.query(async ({ ctx }) => {
    const deletedHabits = await ctx.prisma.habit.findMany({
      where: {
        userId: ctx.user.id,
        deletedAt: {
          not: null
        }
      },
      include: {
        objectives: true
      },
      orderBy: {
        deletedAt: 'desc'
      }
    })

    return {
      habits: deletedHabits
    }
  }),

  createCompletion: protectedProcedure.input(habitIdSchema).mutation(async ({ ctx, input }) => {
    await getUserHabit(ctx.prisma, input.id, ctx.user.id)

    const completion = await ctx.prisma.habitCompletion.create({
      data: { habitId: input.id, userId: ctx.user.id }
    })

    return {
      completion
    }
  }),

  deleteCompletion: protectedProcedure.input(habitCompletionIdSchema).mutation(async ({ ctx, input }) => {
    await getUserHabitCompletion(ctx.prisma, input.id, ctx.user.id)

    await ctx.prisma.habitCompletion.delete({
      where: {
        id: input.id
      }
    })

    return {
      message: 'Habit completion deleted successfully'
    }
  })
})
