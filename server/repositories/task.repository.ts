import type { BulkUpdateTaskItem, CreateTaskType, UpdateTaskType } from '@shared/schemas/tasks.schemas'
import { TaskStatus } from '@shared/schemas/tasks.schemas'
import { TRPCError } from '@trpc/server'
import { Prisma, type PrismaClient, type Task } from '../generated/prisma'

const TASK_INCLUDE = {
  objectives: {
    include: { areas: true }
  }
}

export class TaskRepository {
  constructor(private prisma: PrismaClient) {}

  async create(userId: string, input: CreateTaskType): Promise<Task> {
    return this.prisma.task.create({
      data: {
        title: input.title,
        status: input.status,
        order: input.order || 0,
        ...(input.description && { description: input.description }),
        ...(input.dueDate && { dueDate: input.dueDate }),
        ...(input.color && { color: input.color }),
        ...(input.effort && { effort: input.effort }),
        ...(input.impact && { impact: input.impact }),
        userId,
        objectives: {
          connect: input.objectives?.map((objectiveId) => ({ id: objectiveId })) || []
        }
      },
      include: TASK_INCLUDE
    })
  }

  async findAll(userId: string): Promise<Task[]> {
    return this.prisma.task.findMany({
      where: { userId },
      include: TASK_INCLUDE,
      orderBy: [{ status: 'asc' }, { order: 'asc' }]
    })
  }

  async findByDate(userId: string, startDate: Date, endDate: Date): Promise<Task[]> {
    return this.prisma.task.findMany({
      where: {
        userId,
        dueDate: {
          gte: startDate,
          lte: endDate
        }
      },
      include: TASK_INCLUDE,
      orderBy: [{ dueDate: 'asc' }]
    })
  }

  async findByIdOrThrow(id: string, userId: string): Promise<Task & { objectives: { id: string }[] }> {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: TASK_INCLUDE
    })

    if (!task || task.userId !== userId) {
      throw new TRPCError({ code: 'NOT_FOUND', message: `Task ${id} not found` })
    }

    return task
  }

  async update(_id: string, input: UpdateTaskType, isCompleting: boolean): Promise<Task> {
    return this.prisma.task.update({
      where: { id: input.id },
      data: {
        ...(input.title && { title: input.title }),
        ...(input.status !== undefined && { status: input.status }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.dueDate !== undefined && { dueDate: input.dueDate }),
        ...(input.order !== undefined && { order: input.order }),
        ...(input.color !== undefined && { color: input.color }),
        ...(input.effort !== undefined && { effort: input.effort }),
        ...(input.impact !== undefined && { impact: input.impact }),
        ...(isCompleting && { completedAt: new Date() }),
        objectives: {
          set: input.objectives?.map((objectiveId) => ({ id: objectiveId })) || []
        }
      },
      include: TASK_INCLUDE
    })
  }

  async updateStatusAndOrder(id: string, status: string, order: number): Promise<Task> {
    return this.prisma.task.update({
      where: { id },
      data: { status, order }
    })
  }

  async bulkUpdate(userId: string, tasks: BulkUpdateTaskItem[]): Promise<void> {
    if (tasks.length === 0) return

    const values = tasks.map((t) => Prisma.sql`(${t.id}::uuid, ${t.status}::varchar, ${t.order}::integer)`)

    const count = await this.prisma.$executeRaw`
      UPDATE "tasks" as t
      SET "status" = c.status, "order" = c."order"
      FROM (VALUES ${Prisma.join(values)}) as c(id, status, "order")
      WHERE c.id = t.id AND "userId" = ${userId}::uuid
    `

    if (count !== tasks.length) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Some tasks not found or access denied' })
    }
  }

  async delete(id: string): Promise<Task> {
    return this.prisma.task.delete({
      where: { id }
    })
  }

  async deleteManyByUserId(userId: string): Promise<void> {
    await this.prisma.task.deleteMany({
      where: { userId }
    })
  }

  async countByStatus(userId: string, status: string | string[], after: Date, before?: Date | null): Promise<number> {
    const query: any = {
      userId,
      createdAt: { gte: after }
    }

    if (Array.isArray(status)) {
      query.status = { in: status }
    } else {
      query.status = status
    }

    if (before) {
      query.dueDate = { lt: before }
    } else if (before === null) {
      // Intentionally checking for null to mimic dueDate < now logic for overdue
    } else {
      // For 'upcoming' logic where strict date needed
      if (status === TaskStatus.DONE && before !== undefined) {
        query.dueDate = { lte: before }
      } else if (status === TaskStatus.TODO && before !== undefined) {
        query.dueDate = { gte: before }
      } else if (status === TaskStatus.DOING && before !== undefined) {
        query.dueDate = { gte: before }
      }
    }

    return this.prisma.task.count({ where: query })
  }

  async countOverdue(userId: string, after: Date, now: Date): Promise<number> {
    return this.prisma.task.count({
      where: {
        userId,
        status: { in: [TaskStatus.TODO, TaskStatus.DOING] },
        createdAt: { gte: after },
        dueDate: { lt: now }
      }
    })
  }

  async countDone(userId: string, after: Date, before: Date): Promise<number> {
    return this.prisma.task.count({
      where: {
        userId,
        status: TaskStatus.DONE,
        createdAt: { gte: after },
        dueDate: { lte: before }
      }
    })
  }

  async countDoing(userId: string, after: Date, now: Date): Promise<number> {
    return this.prisma.task.count({
      where: {
        userId,
        status: TaskStatus.DOING,
        createdAt: { gte: after },
        dueDate: { gte: now }
      }
    })
  }

  async countTodo(userId: string, after: Date, now: Date): Promise<number> {
    return this.prisma.task.count({
      where: {
        userId,
        status: TaskStatus.TODO,
        createdAt: { gte: after },
        dueDate: { gte: now }
      }
    })
  }

  async findUpcoming(userId: string, limit: number, before: Date): Promise<Task[]> {
    return this.prisma.task.findMany({
      where: {
        userId,
        status: { not: TaskStatus.DONE },
        dueDate: { not: null, lte: before }
      },
      orderBy: { dueDate: 'asc' },
      take: limit
    })
  }

  async findRecentWithObjectives(userId: string, after: Date): Promise<Task[]> {
    return this.prisma.task.findMany({
      where: { userId, updatedAt: { gte: after } },
      include: { objectives: { include: { areas: true } } }
    })
  }
}
