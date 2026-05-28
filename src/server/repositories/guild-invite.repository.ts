import type { GuildInvite, PrismaClient } from '@/generated/prisma'
import { generatePublicId } from '../lib/public-id'

export class GuildInviteRepository {
  constructor(private prisma: PrismaClient) {}

  async findByToken(token: string): Promise<GuildInvite | null> {
    return this.prisma.guildInvite.findUnique({ where: { token } })
  }

  async findById(id: bigint): Promise<GuildInvite | null> {
    return this.prisma.guildInvite.findUnique({ where: { id } })
  }

  async findByPublicId(publicId: string): Promise<GuildInvite | null> {
    return this.prisma.guildInvite.findUnique({ where: { publicId } })
  }

  async findByGuild(guildId: bigint): Promise<GuildInvite[]> {
    return this.prisma.guildInvite.findMany({
      where: { guildId, revokedAt: null },
      orderBy: { createdAt: 'desc' }
    })
  }

  async countActiveByGuild(guildId: bigint, now: Date = new Date()): Promise<number> {
    return this.prisma.guildInvite.count({
      where: {
        guildId,
        revokedAt: null,
        expiresAt: { gt: now }
      }
    })
  }

  async create(data: {
    guildId: bigint
    token: string
    createdBy: string
    expiresAt: Date
    maxUses?: number
  }): Promise<GuildInvite> {
    return this.prisma.guildInvite.create({ data: { ...data, publicId: generatePublicId() } })
  }

  async revoke(id: bigint): Promise<void> {
    await this.prisma.guildInvite.update({
      where: { id },
      data: { revokedAt: new Date() }
    })
  }
}
