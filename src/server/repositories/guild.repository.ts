import type {
  Guild,
  GuildCampaign,
  GuildCampaignProgress,
  Prisma,
  PrismaClient
} from '@/generated/prisma'
import { generatePublicId } from '../lib/public-id'

export type GuildCampaignWithEntries = GuildCampaign & {
  progressEntries: GuildCampaignProgress[]
}

export class GuildRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: bigint): Promise<Guild | null> {
    return this.prisma.guild.findUnique({ where: { id } })
  }

  async findBySlug(slug: string): Promise<Guild | null> {
    return this.prisma.guild.findUnique({ where: { slug } })
  }

  async create(data: { name: string; slug: string; description?: string; ownerId: string; factionName: string }): Promise<Guild> {
    return this.prisma.guild.create({ data: { ...data, publicId: generatePublicId() } })
  }

  async update(id: bigint, data: { name?: string; description?: string }): Promise<Guild> {
    return this.prisma.guild.update({ where: { id }, data })
  }

  async updateAvailableTitles(id: bigint, titles: string[]): Promise<Guild> {
    return this.prisma.guild.update({ where: { id }, data: { availableTitles: titles } })
  }

  async delete(id: bigint): Promise<void> {
    await this.prisma.guild.delete({ where: { id } })
  }

  // ========== Campaigns ==========

  async findActiveCampaignByGuild(guildId: bigint): Promise<GuildCampaign | null> {
    return this.prisma.guildCampaign.findFirst({
      where: { guildId, completedAt: null },
      orderBy: { startedAt: 'desc' }
    })
  }

  async findCurrentCampaignByGuildWithEntries(guildId: bigint): Promise<GuildCampaignWithEntries | null> {
    return this.prisma.guildCampaign.findFirst({
      where: { guildId },
      orderBy: { startedAt: 'desc' },
      include: { progressEntries: true }
    })
  }

  async findCampaignById(id: bigint): Promise<GuildCampaign | null> {
    return this.prisma.guildCampaign.findUnique({ where: { id } })
  }

  async findCampaignByPublicId(publicId: string): Promise<GuildCampaign | null> {
    return this.prisma.guildCampaign.findUnique({ where: { publicId } })
  }

  async listCampaignsByGuild(guildId: bigint, limit = 20): Promise<GuildCampaign[]> {
    return this.prisma.guildCampaign.findMany({
      where: { guildId },
      orderBy: { startedAt: 'desc' },
      take: limit
    })
  }

  async createCampaign(data: {
    guildId: bigint
    templateId: string
    eventType: string
    target: number
    rewardPool: Prisma.InputJsonValue
    startedBy: string
    expiresAt: Date
  }): Promise<GuildCampaign> {
    return this.prisma.guildCampaign.create({ data: { ...data, publicId: generatePublicId() } })
  }
}
