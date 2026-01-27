import type { CreateAreaBodyType, UpdateAreaBodyType } from '@shared/schemas/areas.schemas'
import type { AreaRepository } from '../repositories/area.repository'

export class AreaService {
  constructor(private areaRepository: AreaRepository) {}

  async create(userId: string, input: CreateAreaBodyType) {
    const area = await this.areaRepository.create(userId, input)
    return { area }
  }

  async getAll(userId: string) {
    const areas = await this.areaRepository.findAll(userId)
    return { areas }
  }

  async update(userId: string, input: UpdateAreaBodyType) {
    await this.areaRepository.findByIdOrThrow(input.id, userId)
    const area = await this.areaRepository.update(input.id, input)
    return { area }
  }

  async delete(userId: string, id: string) {
    await this.areaRepository.findByIdOrThrow(id, userId)
    await this.areaRepository.delete(id)
    return { message: 'Area deleted successfully' }
  }
}
