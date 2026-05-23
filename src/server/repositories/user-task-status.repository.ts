import type {
  CreateUserTaskStatusBodyType,
  UpdateUserTaskStatusBodyType
} from '@shared/schemas/user-task-statuses.schemas'
import { TRPCError } from '@trpc/server'
import type { PrismaClient, UserTaskStatus } from '@/generated/prisma'

export interface BulkApplyOps {
  create: Array<{ label: string; color?: string | null }>
  update: Array<{ id: string; label?: string; color?: string | null }>
  delete: string[]
  reassignToStatusId: string
}

export class UserTaskStatusRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(userId: string): Promise<UserTaskStatus[]> {
    return this.prisma.userTaskStatus.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' }
    })
  }

  async findByIdOrThrow(id: string, userId: string): Promise<UserTaskStatus> {
    const status = await this.prisma.userTaskStatus.findUnique({ where: { id } })
    if (!status || status.userId !== userId) {
      throw new TRPCError({ code: 'NOT_FOUND', message: `Task status ${id} not found` })
    }
    return status
  }

  async findDoneByUserId(userId: string): Promise<UserTaskStatus | null> {
    return this.prisma.userTaskStatus.findFirst({
      where: { userId, label: 'DONE' }
    })
  }

  async findDefault(userId: string): Promise<UserTaskStatus | null> {
    return this.prisma.userTaskStatus.findFirst({
      where: { userId, isDefault: true }
    })
  }

  async findNextAfter(userId: string, excludeId: string): Promise<UserTaskStatus | null> {
    return this.prisma.userTaskStatus.findFirst({
      where: { userId, id: { not: excludeId } },
      orderBy: { createdAt: 'asc' }
    })
  }

  async countByUserId(userId: string): Promise<number> {
    return this.prisma.userTaskStatus.count({ where: { userId } })
  }

  async create(userId: string, input: CreateUserTaskStatusBodyType): Promise<UserTaskStatus> {
    return this.prisma.userTaskStatus.create({
      data: {
        userId,
        label: input.label,
        ...(input.color !== undefined && { color: input.color })
      }
    })
  }

  async update(id: string, userId: string, input: UpdateUserTaskStatusBodyType): Promise<UserTaskStatus> {
    const existing = await this.findByIdOrThrow(id, userId)
    return this.prisma.userTaskStatus.update({
      where: { id: existing.id },
      data: {
        ...(input.label !== undefined && { label: input.label }),
        ...(input.color !== undefined && { color: input.color })
      }
    })
  }

  async delete(id: string, userId: string, reassignToStatusId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.task.updateMany({
        where: { userId, statusId: id },
        data: { statusId: reassignToStatusId }
      }),
      this.prisma.userTaskStatus.delete({ where: { id } })
    ])
  }

  async setDefault(userId: string, id: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.userTaskStatus.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false }
      }),
      this.prisma.userTaskStatus.update({
        where: { id },
        data: { isDefault: true }
      })
    ])
  }

  async bulkApply(userId: string, ops: BulkApplyOps): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      if (ops.delete.length > 0) {
        await tx.task.updateMany({
          where: { userId, statusId: { in: ops.delete } },
          data: { statusId: ops.reassignToStatusId }
        })
        await tx.userTaskStatus.deleteMany({
          where: { id: { in: ops.delete }, userId }
        })
      }

      for (const upd of ops.update) {
        await tx.userTaskStatus.update({
          where: { id: upd.id },
          data: {
            ...(upd.label !== undefined && { label: upd.label }),
            ...(upd.color !== undefined && { color: upd.color })
          }
        })
      }

      if (ops.create.length > 0) {
        await tx.userTaskStatus.createMany({
          data: ops.create.map((c) => ({
            userId,
            label: c.label,
            ...(c.color !== undefined && c.color !== null && { color: c.color })
          }))
        })
      }
    })
  }
}
