import { Prisma, type PrismaClient, type Task } from '@/generated/prisma'
import type { CreateTaskType, UpdateTaskType } from '@shared/schemas/tasks.schemas'
import { TRPCError } from '@trpc/server'
import { RESOURCE_NOT_FOUND_OR_FORBIDDEN } from '../lib/errors'
import { logger } from '../lib/logger'
import { generatePublicId } from '../lib/public-id'

const log = logger.child({ component: 'task-repository' })

const TASK_INCLUDE = {
  status: true,
  objectives: {
    include: { areas: true }
  },
  areas: true
} satisfies Prisma.TaskInclude

export type TaskWithRelations = Prisma.TaskGetPayload<{ include: typeof TASK_INCLUDE }>

export class TaskRepository {
  constructor(private prisma: PrismaClient) {}

  async create(userId: string, input: CreateTaskType, statusId: bigint): Promise<Task> {
    return this.prisma.task.create({
      data: {
        publicId: generatePublicId(),
        title: input.title,
        statusId,
        order: input.order || 0,
        ...(input.description && { description: input.description }),
        ...(input.dueDate && { dueDate: input.dueDate }),
        ...(input.color && { color: input.color }),
        ...(input.effort && { effort: input.effort }),
        ...(input.impact && { impact: input.impact }),
        userId,
        objectives: {
          connect: input.objectives?.map((publicId) => ({ publicId })) || []
        },
        areas: {
          connect: input.areas?.map((publicId) => ({ publicId })) || []
        }
      },
      include: TASK_INCLUDE
    })
  }

  async findAll(userId: string): Promise<TaskWithRelations[]> {
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
      statusIds?: bigint[]
      effortImpact?: string[]
      dueDate?: Date
    },
    pagination: { page: number; pageSize: number }
  ): Promise<{ tasks: TaskWithRelations[]; totalCount: number }> {
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

  async findByDate(userId: string, startDate: Date, endDate: Date): Promise<TaskWithRelations[]> {
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

  async findByPublicId(publicId: string, userId: string): Promise<Task | null> {
    const task = await this.prisma.task.findUnique({ where: { publicId } })
    if (!task || task.userId !== userId) return null
    return task
  }

  async findByIdOrThrow(
    id: bigint,
    userId: string
  ): Promise<Task & { objectives: { id: bigint; publicId: string }[]; areas: { id: bigint; publicId: string }[] }> {
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

  async update(id: bigint, input: UpdateTaskType, statusId: bigint | undefined, isCompleting: boolean): Promise<Task> {
    return this.prisma.task.update({
      where: { id },
      data: {
        ...(input.title && { title: input.title }),
        ...(statusId !== undefined && { statusId }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.dueDate !== undefined && { dueDate: input.dueDate }),
        ...(input.order !== undefined && { order: input.order }),
        ...(input.color !== undefined && { color: input.color }),
        ...(input.effort !== undefined && { effort: input.effort }),
        ...(input.impact !== undefined && { impact: input.impact }),
        ...(isCompleting && { completedAt: new Date() }),
        objectives: {
          set: input.objectives?.map((publicId) => ({ publicId })) || []
        },
        areas: {
          set: input.areas?.map((publicId) => ({ publicId })) || []
        }
      },
      include: TASK_INCLUDE
    })
  }

  async updateStatusAndOrder(id: bigint, statusId: bigint, order: number): Promise<Task> {
    return this.prisma.task.update({
      where: { id },
      data: { statusId, order }
    })
  }

  async findManyByPublicIds(
    publicIds: string[],
    userId: string
  ): Promise<Array<Pick<Task, 'id' | 'publicId' | 'statusId' | 'impact'>>> {
    if (publicIds.length === 0) return []
    return this.prisma.task.findMany({
      where: { publicId: { in: publicIds }, userId },
      select: { id: true, publicId: true, statusId: true, impact: true }
    })
  }

  async bulkUpdate(
    userId: string,
    items: Array<{ id: bigint; statusId: bigint; order: number }>,
    completingIds: bigint[] = [],
    completedAt: Date = new Date()
  ): Promise<void> {
    if (items.length === 0) return

    await this.prisma.$transaction(async (tx) => {
      let updated = 0
      for (const item of items) {
        const result = await tx.task.updateMany({
          where: { id: item.id, userId },
          data: { statusId: item.statusId, order: item.order }
        })
        updated += result.count
      }

      if (updated !== items.length) {
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

  async delete(id: bigint): Promise<Task> {
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
    statusIds: bigint | bigint[],
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
  objectives: Array<{ id: bigint; name: string; areas: Array<{ id: bigint; name: string }> }>
}
