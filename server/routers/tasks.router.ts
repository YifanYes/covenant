import {
  bulkUpdateTasksSchema,
  createTaskSchema,
  getByDateInputSchema,
  taskIdSchema,
  updateTaskSchema
} from '@shared/schemas/tasks.schemas'
import { TRPCError } from '@trpc/server'
import { getUserTask } from '../services/tasks.services'
import { protectedProcedure, t } from '../trpc'

export const tasksRouter = t.router({
  create: protectedProcedure.input(createTaskSchema).mutation(async ({ ctx, input }) => {
    const task = await ctx.prisma.task.create({
      data: {
        title: input.title,
        status: input.status,
        order: input.order || 0,
        ...(input.description && { description: input.description }),
        ...(input.dueDate && { dueDate: input.dueDate }),
        userId: ctx.user.id,
        objectives: {
          connect: input.objectives?.map((objectiveId) => ({ id: objectiveId })) || []
        }
      },
      include: {
        objectives: {
          include: {
            areas: true
          }
        }
      }
    })

    return {
      task
    }
  }),
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const tasks = await ctx.prisma.task.findMany({
      where: { userId: ctx.user.id },
      include: {
        objectives: {
          include: { areas: true }
        }
      },
      orderBy: [{ status: 'asc' }, { order: 'asc' }]
    })

    const groupedTasks = tasks.reduce(
      (acc, task) => {
        if (!acc[task.status]) acc[task.status] = []
        acc[task.status].push(task)
        return acc
      },
      {} as Record<string, typeof tasks>
    )

    return { tasks: groupedTasks }
  }),
  getByDate: protectedProcedure.input(getByDateInputSchema).query(async ({ ctx, input }) => {
    const year = Number(input.year ?? new Date().getFullYear())
    const monthIndex = Number(input.monthIndex ?? new Date().getMonth())

    const startDate = new Date(year, monthIndex, 1, 0, 0, 0, 0)
    const endDate = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999)

    const tasks = await ctx.prisma.task.findMany({
      where: {
        userId: ctx.user.id,
        dueDate: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        objectives: {
          include: { areas: true }
        }
      },
      orderBy: [{ dueDate: 'asc' }]
    })

    return { tasks }
  }),
  update: protectedProcedure.input(updateTaskSchema).mutation(async ({ ctx, input }) => {
    await getUserTask(ctx.prisma, input.id, ctx.user.id)

    const task = await ctx.prisma.task.update({
      where: {
        id: input.id
      },
      data: {
        ...(input.title && { title: input.title }),
        ...(input.status !== undefined && { status: input.status }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.dueDate !== undefined && { dueDate: input.dueDate }),
        ...(input.order !== undefined && { order: input.order }),
        objectives: {
          set: input.objectives?.map((objectiveId) => ({ id: objectiveId })) || []
        }
      },
      include: {
        objectives: {
          include: {
            areas: true
          }
        }
      }
    })

    return {
      task
    }
  }),
  bulkUpdate: protectedProcedure.input(bulkUpdateTasksSchema).mutation(async ({ ctx, input }) => {
    // Verify all tasks belong to the user
    const taskIds = input.tasks.map((task) => task.id)
    const existingTasks = await ctx.prisma.task.findMany({
      where: {
        id: { in: taskIds },
        userId: ctx.user.id
      },
      select: { id: true }
    })

    if (existingTasks.length !== taskIds.length) {
      const foundIds = existingTasks.map((task) => task.id)
      const missingIds = taskIds.filter((id) => !foundIds.includes(id))
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Tasks not found: ${missingIds.join(', ')}`
      })
    }

    await ctx.prisma.$transaction(
      input.tasks.map((task) =>
        ctx.prisma.task.update({
          where: { id: task.id },
          data: {
            status: task.status,
            order: task.order
          }
        })
      )
    )

    return {
      message: `Tasks updated successfully`
    }
  }),
  delete: protectedProcedure.input(taskIdSchema).mutation(async ({ ctx, input }) => {
    await getUserTask(ctx.prisma, input.id, ctx.user.id)

    await ctx.prisma.task.delete({
      where: {
        id: input.id
      }
    })

    return {
      message: 'Task deleted successfully'
    }
  })
})
