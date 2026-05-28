import type { CreateAreaBodyType, UpdateAreaBodyType } from '@shared/schemas/areas.schemas'
import { TRPCError } from '@trpc/server'
import type { Area, Objective, PrismaClient } from '@/generated/prisma'
import { generatePublicId } from '../lib/public-id'

export class AreaRepository {
  constructor(private prisma: PrismaClient) {}

  async create(userId: string, input: CreateAreaBodyType): Promise<Area> {
    return this.prisma.area.create({
      data: {
        publicId: generatePublicId(),
        name: input.name,
        ...(input.color && { color: input.color }),
        ...(input.icon && { icon: input.icon }),
        userId
      }
    })
  }

  async findByPublicId(publicId: string, userId: string): Promise<Area | null> {
    const area = await this.prisma.area.findUnique({ where: { publicId } })
    if (!area || area.userId !== userId) return null
    return area
  }

  async findAll(userId: string): Promise<Area[]> {
    return this.prisma.area.findMany({
      where: { userId }
    })
  }

  async findById(id: bigint): Promise<Area | null> {
    return this.prisma.area.findUnique({
      where: { id }
    })
  }

  async findByIdOrThrow(id: bigint, userId: string): Promise<Area> {
    const area = await this.prisma.area.findUnique({
      where: { id }
    })

    if (!area || area.userId !== userId) {
      throw new TRPCError({ code: 'NOT_FOUND', message: `Area ${id} not found` })
    }

    return area
  }

  async findWithHierarchy(userId: string): Promise<(Area & { objectives: Objective[] })[]> {
    return this.prisma.area.findMany({
      where: { userId },
      include: {
        objectives: true
      }
    })
  }

  async update(id: bigint, userId: string, input: UpdateAreaBodyType): Promise<Area> {
    const area = await this.prisma.area.findUnique({ where: { id } })
    if (!area || area.userId !== userId) {
      throw new TRPCError({ code: 'NOT_FOUND', message: `Area ${id} not found` })
    }

    return this.prisma.area.update({
      where: { id },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.color && { color: input.color }),
        ...(input.icon && { icon: input.icon })
      }
    })
  }

  async delete(id: bigint, userId: string): Promise<Area> {
    const area = await this.prisma.area.findUnique({ where: { id } })
    if (!area || area.userId !== userId) {
      throw new TRPCError({ code: 'NOT_FOUND', message: `Area ${id} not found` })
    }

    return this.prisma.area.delete({
      where: { id }
    })
  }

  async deleteManyByUserId(userId: string): Promise<void> {
    await this.prisma.area.deleteMany({
      where: { userId }
    })
  }
}
