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
    const area = await this.areaRepository.update(input.id, userId, input)
    return { area }
  }

  async delete(userId: string, id: string) {
    await this.areaRepository.delete(id, userId)
    return { message: 'Area deleted successfully' }
  }
}
