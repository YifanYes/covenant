import type { PrismaClient } from '../generated/prisma'
import { MapRepository } from '../repositories/map.repository'

export class MapService {
  private mapRepository: MapRepository

  constructor(prisma: PrismaClient) {
    this.mapRepository = new MapRepository(prisma)
  }

  async getMapState() {
    return this.mapRepository.getAllMapStates()
  }
}
