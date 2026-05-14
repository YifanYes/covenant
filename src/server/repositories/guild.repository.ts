import type {
  Guild,
  GuildCampaign,
  GuildCampaignProgress,
  Prisma,
  PrismaClient
} from '@/generated/prisma'

export type GuildCampaignWithEntries = GuildCampaign & {
  progressEntries: GuildCampaignProgress[]
}

export class GuildRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<Guild | null> {
    return this.prisma.guild.findUnique({ where: { id } })
  }

  async create(data: { name: string; description?: string; ownerId: string; factionName: string }): Promise<Guild> {
    return this.prisma.guild.create({ data })
  }

  async update(id: string, data: { name?: string; description?: string }): Promise<Guild> {
    return this.prisma.guild.update({ where: { id }, data })
  }

  async delete(id: string): Promise<void> {
    await this.prisma.guild.delete({ where: { id } })
  }

  // ========== Campaigns ==========

  async findActiveCampaignByGuild(guildId: string): Promise<GuildCampaign | null> {
    return this.prisma.guildCampaign.findFirst({
      where: { guildId, completedAt: null },
      orderBy: { startedAt: 'desc' }
    })
  }

  async findCurrentCampaignByGuildWithEntries(guildId: string): Promise<GuildCampaignWithEntries | null> {
    return this.prisma.guildCampaign.findFirst({
      where: { guildId },
      orderBy: { startedAt: 'desc' },
      include: { progressEntries: true }
    })
  }

  async findCampaignById(id: string): Promise<GuildCampaign | null> {
    return this.prisma.guildCampaign.findUnique({ where: { id } })
  }

  async listCampaignsByGuild(guildId: string, limit = 20): Promise<GuildCampaign[]> {
    return this.prisma.guildCampaign.findMany({
      where: { guildId },
      orderBy: { startedAt: 'desc' },
      take: limit
    })
  }

  async createCampaign(data: {
    guildId: string
    templateId: string
    eventType: string
    target: number
    rewardPool: Prisma.InputJsonValue
    startedBy: string
    expiresAt: Date
  }): Promise<GuildCampaign> {
    return this.prisma.guildCampaign.create({ data })
  }
}
