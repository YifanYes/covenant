import { type Party, type PrismaClient } from '../generated/prisma'

export class PartyRepository {
  constructor(private prisma: PrismaClient) {}

  async create(name: string): Promise<Party> {
    return this.prisma.party.create({
      data: { name }
    })
  }

  async findById(id: string): Promise<Party | null> {
    return this.prisma.party.findUnique({
      where: { id }
    })
  }

  async setCurrentMission(partyId: string, missionId: string | null): Promise<void> {
    await this.prisma.party.update({
      where: { id: partyId },
      data: { currentMissionId: missionId }
    })
  }
}
