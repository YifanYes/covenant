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

export const duplicateTask = async (
  prisma: PrismaClient,
  taskId: string,
  userId: string,
  titleSuffix?: string
): Promise<Task> => {
  const existingTask = await getUserTask(prisma, taskId, userId)

  const { id, createdAt, updatedAt, completedAt, ...taskData } = existingTask

  const newTask = await prisma.task.create({
    data: {
      ...taskData,
      title: `${taskData.title} ${titleSuffix || '(Copy)'}`,
      userId
    },
    include: {
      objectives: {
        include: {
          areas: true
        }
      }
    }
  })

  if (existingTask) {
    const taskObjectives = await prisma.task.findUnique({
      where: { id: taskId },
      select: { objectives: { select: { id: true } } }
    })

    if (taskObjectives?.objectives.length) {
      await prisma.task.update({
        where: { id: newTask.id },
        data: {
          objectives: {
            connect: taskObjectives.objectives.map((obj) => ({ id: obj.id }))
          }
        }
      })
    }
  }

  return newTask
}
