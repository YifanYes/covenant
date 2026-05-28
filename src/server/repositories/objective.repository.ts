import type { Objective, PrismaClient } from '@/generated/prisma'
import type { CreateObjectiveBodyType, UpdateObjectiveBodyType } from '@shared/schemas/objectives.schemas'
import { TRPCError } from '@trpc/server'
import { RESOURCE_NOT_FOUND_OR_FORBIDDEN } from '../lib/errors'
import { logger } from '../lib/logger'
import { generatePublicId } from '../lib/public-id'

const log = logger.child({ component: 'objective-repository' })

const OBJECTIVE_INCLUDE = {
  areas: true
}

export class ObjectiveRepository {
  constructor(private prisma: PrismaClient) {}

  async create(userId: string, input: CreateObjectiveBodyType): Promise<Objective> {
    return this.prisma.objective.create({
      data: {
        publicId: generatePublicId(),
        name: input.name,
        ...(input.description && { description: input.description }),
        ...(input.dueDate && { dueDate: input.dueDate }),
        userId,
        areas: {
          connect: input.areas?.map((publicId) => ({ publicId })) || []
        }
      },
      include: OBJECTIVE_INCLUDE
    })
  }

  async findByPublicId(publicId: string, userId: string): Promise<Objective | null> {
    const objective = await this.prisma.objective.findUnique({ where: { publicId } })
    if (!objective || objective.userId !== userId) return null
    return objective
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

  async update(id: bigint, userId: string, input: UpdateObjectiveBodyType): Promise<Objective> {
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
          set: input.areas?.map((publicId) => ({ publicId })) || []
        },
        ...(input.tasks !== undefined && {
          tasks: { set: input.tasks.map((publicId) => ({ publicId })) }
        }),
        ...(input.habits !== undefined && {
          habits: { set: input.habits.map((publicId) => ({ publicId })) }
        })
      },
      include: OBJECTIVE_INCLUDE
    })
  }

  async complete(id: bigint, userId: string): Promise<Objective> {
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

  async delete(id: bigint, userId: string): Promise<Objective> {
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

  async findByIdOrThrow(id: bigint, userId: string): Promise<Objective> {
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
