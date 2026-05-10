import type { GuildInvite, PrismaClient } from '@/generated/prisma'

export class GuildInviteRepository {
  constructor(private prisma: PrismaClient) {}

  async findByToken(token: string): Promise<GuildInvite | null> {
    return this.prisma.guildInvite.findUnique({ where: { token } })
  }

  async findById(id: string): Promise<GuildInvite | null> {
    return this.prisma.guildInvite.findUnique({ where: { id } })
  }

  async findByGuild(guildId: string): Promise<GuildInvite[]> {
    return this.prisma.guildInvite.findMany({
      where: { guildId, revokedAt: null },
      orderBy: { createdAt: 'desc' }
    })
  }

  async countActiveByGuild(guildId: string, now: Date = new Date()): Promise<number> {
    return this.prisma.guildInvite.count({
      where: {
        guildId,
        revokedAt: null,
        expiresAt: { gt: now }
      }
    })
  }

  async create(data: {
    guildId: string
    token: string
    createdBy: string
    expiresAt: Date
    maxUses?: number
  }): Promise<GuildInvite> {
    return this.prisma.guildInvite.create({ data })
  }

  async revoke(id: string): Promise<void> {
    await this.prisma.guildInvite.update({
      where: { id },
      data: { revokedAt: new Date() }
    })
  }
}
