import { TRPCError } from '@trpc/server'
import { Habit, HabitCompletion, PrismaClient } from '../generated/prisma/client'

export const getUserHabit = async (prisma: PrismaClient, habitId: string, userId: string): Promise<Habit> => {
  const habit = await prisma.habit.findFirst({
    where: {
      id: habitId,
      userId: userId
    }
  })

  if (!habit) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Habit not found'
    })
  }

  return habit
}

export const getUserHabitCompletion = async (
  prisma: PrismaClient,
  habitCompletionId: string,
  userId: string
): Promise<HabitCompletion> => {
  const habitCompletion = await prisma.habitCompletion.findFirst({
    where: {
      id: habitCompletionId,
      userId: userId
    }
  })

  if (!habitCompletion) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Habit completion not found'
    })
  }

  return habitCompletion
}
