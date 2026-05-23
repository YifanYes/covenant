import { Prisma, type PrismaClient, type Task } from '@/generated/prisma'
import type { BulkUpdateTaskItem, CreateTaskType, UpdateTaskType } from '@shared/schemas/tasks.schemas'
import { TRPCError } from '@trpc/server'
import { RESOURCE_NOT_FOUND_OR_FORBIDDEN } from '../lib/errors'
import { logger } from '../lib/logger'

const log = logger.child({ component: 'task-repository' })

const TASK_INCLUDE = {
  status: true,
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
        statusId: input.statusId,
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
      orderBy: [{ status: { createdAt: 'asc' } }, { order: 'asc' }]
    })
  }

  async findFiltered(
    userId: string,
    filters: {
      search?: string
      statusIds?: string[]
      effortImpact?: string[]
      dueDate?: Date
    },
    pagination: { page: number; pageSize: number }
  ): Promise<{ tasks: Task[]; totalCount: number }> {
    const where: Prisma.TaskWhereInput = { userId }

    if (filters.search) {
      where.title = { contains: filters.search, mode: 'insensitive' }
    }

    if (filters.statusIds?.length) {
      where.statusId = { in: filters.statusIds }
    }

    if (filters.effortImpact?.length) {
      where.OR = filters.effortImpact.map((combo) => {
        const [impact, effort] = combo.split('|')
        return { impact, effort }
      })
    }

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
        orderBy: [{ status: { createdAt: 'asc' } }, { order: 'asc' }],
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

  async findByIdOrThrow(
    id: string,
    userId: string
  ): Promise<Task & { objectives: { id: string }[]; areas: { id: string }[] }> {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: TASK_INCLUDE
    })

    if (!task) {
      throw new TRPCError({ code: 'NOT_FOUND', message: RESOURCE_NOT_FOUND_OR_FORBIDDEN })
    }
    if (task.userId !== userId) {
      log.warn({ resourceId: id, requestingUserId: userId }, 'Unauthorized task access attempt')
      throw new TRPCError({ code: 'NOT_FOUND', message: RESOURCE_NOT_FOUND_OR_FORBIDDEN })
    }

    return task
  }

  async update(_id: string, input: UpdateTaskType, isCompleting: boolean): Promise<Task> {
    return this.prisma.task.update({
      where: { id: input.id },
      data: {
        ...(input.title && { title: input.title }),
        ...(input.statusId !== undefined && { statusId: input.statusId }),
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

  async updateStatusAndOrder(id: string, statusId: string, order: number): Promise<Task> {
    return this.prisma.task.update({
      where: { id },
      data: { statusId, order }
    })
  }

  async findManyByIds(
    ids: string[],
    userId: string
  ): Promise<Array<Pick<Task, 'id' | 'statusId' | 'impact'>>> {
    if (ids.length === 0) return []
    return this.prisma.task.findMany({
      where: { id: { in: ids }, userId },
      select: { id: true, statusId: true, impact: true }
    })
  }

  async bulkUpdate(
    userId: string,
    tasks: BulkUpdateTaskItem[],
    completingIds: string[] = [],
    completedAt: Date = new Date()
  ): Promise<void> {
    if (tasks.length === 0) return

    await this.prisma.$transaction(async (tx) => {
      let updated = 0
      for (const t of tasks) {
        const result = await tx.task.updateMany({
          where: { id: t.id, userId },
          data: { statusId: t.statusId, order: t.order }
        })
        updated += result.count
      }

      if (updated !== tasks.length) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Some tasks not found or access denied' })
      }

      if (completingIds.length > 0) {
        await tx.task.updateMany({
          where: { id: { in: completingIds }, userId },
          data: { completedAt }
        })
      }
    })
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

  async countByStatusIds(
    userId: string,
    statusIds: string | string[],
    dueDate?: Date,
    dueDateComparison: 'lt' | 'gte' = 'lt',
    includeNoDueDate = false
  ): Promise<number> {
    const baseWhere: Prisma.TaskWhereInput = {
      userId,
      statusId: Array.isArray(statusIds) ? { in: statusIds } : statusIds
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

  async findUpcoming(
    userId: string,
    limit: number,
    from: Date,
    before: Date
  ): Promise<Array<Task & { areas: Array<{ color: string | null }> }>> {
    return this.prisma.task.findMany({
      where: {
        userId,
        status: { label: { not: 'DONE' } },
        dueDate: { gte: from, lte: before }
      },
      include: {
        areas: { select: { color: true } }
      },
      orderBy: { dueDate: 'asc' },
      take: limit
    })
  }

  async countUpcoming(userId: string, from: Date, before: Date): Promise<number> {
    return this.prisma.task.count({
      where: {
        userId,
        status: { label: { not: 'DONE' } },
        dueDate: { gte: from, lte: before }
      }
    })
  }

  async findCompletedWithObjectives(userId: string, after: Date): Promise<DoneTaskWithObjectives[]> {
    const rows = await this.prisma.task.findMany({
      where: {
        userId,
        status: { label: 'DONE' },
        completedAt: { gte: after, not: null }
      },
      include: { objectives: { include: { areas: true } } }
    })
    return rows as DoneTaskWithObjectives[]
  }
}

export type DoneTaskWithObjectives = Omit<Task, 'completedAt'> & {
  completedAt: Date
  objectives: Array<{ id: string; name: string; areas: Array<{ id: string; name: string }> }>
}
