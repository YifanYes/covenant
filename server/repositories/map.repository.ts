import { type PrismaClient } from '../generated/prisma'

export class MapRepository {
  constructor(private prisma: PrismaClient) {}

  async getAllMapStates() {
    return this.prisma.mapState.findMany()
  }

  async getMapState(zone: string, area: string) {
    return this.prisma.mapState.findUnique({
      where: {
        zone_area: {
          zone,
          area
        }
      }
    })
  }
}
