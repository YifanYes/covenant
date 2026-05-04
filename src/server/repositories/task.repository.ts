import { Prisma, type PrismaClient, type Task } from '@/generated/prisma'
import type { BulkUpdateTaskItem, CreateTaskType, UpdateTaskType } from '@shared/schemas/tasks.schemas'
import { TaskStatus } from '@shared/schemas/tasks.schemas'
import { TRPCError } from '@trpc/server'
import { logger } from '../lib/logger'

const log = logger.child({ component: 'task-repository' })

const TASK_INCLUDE = {
  objectives: {
    include: { areas: true }
  },
  areas: true
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
        },
        areas: {
          connect: input.areas?.map((areaId) => ({ id: areaId })) || []
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

  async findFiltered(
    userId: string,
    filters: {
      search?: string
      status?: string[]
      effortImpact?: string[] // HIGH | LOW
      dueDate?: Date
    },
    pagination: { page: number; pageSize: number }
  ): Promise<{ tasks: Task[]; totalCount: number }> {
    const where: Prisma.TaskWhereInput = { userId }

    // Search filter (case-insensitive title match)
    if (filters.search) {
      where.title = { contains: filters.search, mode: 'insensitive' }
    }

    // Status filter
    if (filters.status?.length) {
      where.status = { in: filters.status }
    }

    // Effort/Impact filter
    if (filters.effortImpact?.length) {
      where.OR = filters.effortImpact.map((combo) => {
        const [impact, effort] = combo.split('|')
        return { impact, effort }
      })
    }

    // Due date filter (exact day match)
    if (filters.dueDate) {
      const startOfDay = new Date(filters.dueDate)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(filters.dueDate)
      endOfDay.setHours(23, 59, 59, 999)
      where.dueDate = { gte: startOfDay, lte: endOfDay }
    }

    const [tasks, totalCount] = await Promise.all([
      this.prisma.task.findMany({
        where,
        include: TASK_INCLUDE,
        orderBy: [{ status: 'asc' }, { order: 'asc' }],
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize
      }),
      this.prisma.task.count({ where })
    ])

    return { tasks, totalCount }
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

    if (!task) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Resource not found or access denied' })
    }
    if (task.userId !== userId) {
      log.warn({ resourceId: id, requestingUserId: userId }, 'Unauthorized task access attempt')
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Resource not found or access denied' })
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
        },
        areas: {
          set: input.areas?.map((areaId) => ({ id: areaId })) || []
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

  async countByStatus(
    userId: string,
    status: TaskStatus | TaskStatus[],
    dueDate?: Date,
    dueDateComparison: 'lt' | 'gte' = 'lt',
    includeNoDueDate = false
  ): Promise<number> {
    const baseWhere = {
      userId,
      status: Array.isArray(status) ? { in: status } : status
    }

    if (dueDate && includeNoDueDate) {
      return this.prisma.task.count({
        where: {
          ...baseWhere,
          OR: [{ dueDate: { [dueDateComparison]: dueDate } }, { dueDate: null }]
        }
      })
    }

    return this.prisma.task.count({
      where: {
        ...baseWhere,
        ...(dueDate && { dueDate: { [dueDateComparison]: dueDate } })
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
