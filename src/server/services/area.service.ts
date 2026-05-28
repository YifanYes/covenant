import type { Area } from '@/generated/prisma'
import type { CreateAreaBodyType, UpdateAreaBodyType } from '@shared/schemas/areas.schemas'
import { TRPCError } from '@trpc/server'
import { RESOURCE_NOT_FOUND_OR_FORBIDDEN } from '../lib/errors'
import type { AreaRepository } from '../repositories/area.repository'

type AreaDTO = {
  publicId: string
  name: string
  color: string | null
  icon: string | null
}

function toDTO(area: Area): AreaDTO {
  return {
    publicId: area.publicId,
    name: area.name,
    color: area.color,
    icon: area.icon
  }
}

export class AreaService {
  constructor(private areaRepository: AreaRepository) {}

  async create(userId: string, input: CreateAreaBodyType) {
    const area = await this.areaRepository.create(userId, input)
    return { area: toDTO(area) }
  }

  async getAll(userId: string) {
    const areas = await this.areaRepository.findAll(userId)
    return { areas: areas.map(toDTO) }
  }

  async update(userId: string, input: UpdateAreaBodyType) {
    const existing = await this.areaRepository.findByPublicId(input.publicId, userId)
    if (!existing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: RESOURCE_NOT_FOUND_OR_FORBIDDEN })
    }
    const area = await this.areaRepository.update(existing.id, userId, input)
    return { area: toDTO(area) }
  }

  async delete(userId: string, publicId: string) {
    const existing = await this.areaRepository.findByPublicId(publicId, userId)
    if (!existing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: RESOURCE_NOT_FOUND_OR_FORBIDDEN })
    }
    await this.areaRepository.delete(existing.id, userId)
    return { message: 'Area deleted successfully' }
  }
}
