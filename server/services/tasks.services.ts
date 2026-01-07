import { TRPCError } from '@trpc/server'
import { type PrismaClient, type Task } from '../generated/prisma'

export const getUserTask = async (prisma: PrismaClient, taskId: string, userId: string): Promise<Task> => {
  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      userId: userId
    }
  })

  if (!task) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Task not found'
    })
  }

  return task
}
