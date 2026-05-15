import type { Objective, PrismaClient } from '@/generated/prisma'
import type { CreateObjectiveBodyType, UpdateObjectiveBodyType } from '@shared/schemas/objectives.schemas'
import { TRPCError } from '@trpc/server'
import { RESOURCE_NOT_FOUND_OR_FORBIDDEN } from '../lib/errors'
import { logger } from '../lib/logger'

const log = logger.child({ component: 'objective-repository' })

const OBJECTIVE_INCLUDE = {
  areas: true
}

export class ObjectiveRepository {
  constructor(private prisma: PrismaClient) {}

  async create(userId: string, input: CreateObjectiveBodyType): Promise<Objective> {
    return this.prisma.objective.create({
      data: {
        name: input.name,
        ...(input.description && { description: input.description }),
        ...(input.dueDate && { dueDate: input.dueDate }),
        userId,
        areas: {
          connect: input.areas?.map((areaId) => ({ id: areaId })) || []
        }
      },
      include: OBJECTIVE_INCLUDE
    })
  }

  async findAll(userId: string): Promise<Objective[]> {
    return this.prisma.objective.findMany({
      where: {
        userId,
        completedAt: null
      },
      include: {
        areas: true,
        tasks: true,
        habits: {
          where: { deletedAt: null },
          include: { completions: true }
        }
      }
    })
  }

  async update(id: string, userId: string, input: UpdateObjectiveBodyType): Promise<Objective> {
    const objective = await this.prisma.objective.findUnique({ where: { id } })
    if (!objective) {
      throw new TRPCError({ code: 'NOT_FOUND', message: RESOURCE_NOT_FOUND_OR_FORBIDDEN })
    }
    if (objective.userId !== userId) {
      log.warn({ resourceId: id, requestingUserId: userId }, 'Unauthorized objective access attempt')
      throw new TRPCError({ code: 'NOT_FOUND', message: RESOURCE_NOT_FOUND_OR_FORBIDDEN })
    }

    return this.prisma.objective.update({
      where: { id },
      data: {
        name: input.name,
        ...(input.description && { description: input.description }),
        ...(input.dueDate && { dueDate: input.dueDate }),
        areas: {
          set: input.areas?.map((areaId) => ({ id: areaId })) || []
        },
        ...(input.tasks !== undefined && {
          tasks: { set: input.tasks.map((taskId) => ({ id: taskId })) }
        }),
        ...(input.habits !== undefined && {
          habits: { set: input.habits.map((habitId) => ({ id: habitId })) }
        })
      },
      include: OBJECTIVE_INCLUDE
    })
  }

  async complete(id: string, userId: string): Promise<Objective> {
    const objective = await this.prisma.objective.findUnique({ where: { id } })
    if (!objective) {
      throw new TRPCError({ code: 'NOT_FOUND', message: RESOURCE_NOT_FOUND_OR_FORBIDDEN })
    }
    if (objective.userId !== userId) {
      log.warn({ resourceId: id, requestingUserId: userId }, 'Unauthorized objective access attempt')
      throw new TRPCError({ code: 'NOT_FOUND', message: RESOURCE_NOT_FOUND_OR_FORBIDDEN })
    }

    return this.prisma.objective.update({
      where: { id },
      data: { completedAt: new Date() }
    })
  }

  async delete(id: string, userId: string): Promise<Objective> {
    const objective = await this.prisma.objective.findUnique({ where: { id } })
    if (!objective) {
      throw new TRPCError({ code: 'NOT_FOUND', message: RESOURCE_NOT_FOUND_OR_FORBIDDEN })
    }
    if (objective.userId !== userId) {
      log.warn({ resourceId: id, requestingUserId: userId }, 'Unauthorized objective access attempt')
      throw new TRPCError({ code: 'NOT_FOUND', message: RESOURCE_NOT_FOUND_OR_FORBIDDEN })
    }

    return this.prisma.objective.delete({
      where: { id }
    })
  }

  async findByIdOrThrow(id: string, userId: string): Promise<Objective> {
    const objective = await this.prisma.objective.findUnique({
      where: { id }
    })

    if (!objective) {
      throw new TRPCError({ code: 'NOT_FOUND', message: RESOURCE_NOT_FOUND_OR_FORBIDDEN })
    }
    if (objective.userId !== userId) {
      log.warn({ resourceId: id, requestingUserId: userId }, 'Unauthorized objective access attempt')
      throw new TRPCError({ code: 'NOT_FOUND', message: RESOURCE_NOT_FOUND_OR_FORBIDDEN })
    }

    return objective
  }

  async deleteManyByUserId(userId: string): Promise<void> {
    await this.prisma.objective.deleteMany({
      where: { userId }
    })
  }
}
