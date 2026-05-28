import type { GuildMember, PrismaClient } from '@/generated/prisma'
import { generatePublicId } from '../lib/public-id'

export type GuildMemberWithGuildAndMembers = GuildMember & {
  guild: {
    slug: string
    name: string
    description: string | null
    availableTitles: string[]
    factionName: string
    capacity: number
    ownerId: string
    tier: number
    createdAt: Date
    updatedAt: Date
    members: Array<{
      publicId: string
      userId: string
      role: string
      joinedAt: Date
      user: {
        id: string
        image: string | null
        character: { slug: string; name: string; title: string | null } | null
      }
    }>
  }
}

export class GuildMemberRepository {
  constructor(private prisma: PrismaClient) {}

  async findByUserId(userId: string): Promise<GuildMember | null> {
    return this.prisma.guildMember.findUnique({ where: { userId } })
  }

  async findById(id: bigint): Promise<GuildMember | null> {
    return this.prisma.guildMember.findUnique({ where: { id } })
  }

  async findByPublicId(publicId: string): Promise<GuildMember | null> {
    return this.prisma.guildMember.findUnique({ where: { publicId } })
  }

  async findUserIdsByGuild(guildId: bigint): Promise<string[]> {
    const rows = await this.prisma.guildMember.findMany({
      where: { guildId },
      select: { userId: true }
    })
    return rows.map((r) => r.userId)
  }

  async findByUserIdWithGuildAndMembers(userId: string): Promise<GuildMemberWithGuildAndMembers | null> {
    return this.prisma.guildMember.findUnique({
      where: { userId },
      include: {
        guild: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    image: true,
                    character: { select: { slug: true, name: true, title: true } }
                  }
                }
              },
              orderBy: { joinedAt: 'asc' }
            }
          }
        }
      }
    }) as Promise<GuildMemberWithGuildAndMembers | null>
  }

  async findByUserAndGuild(userId: string, guildId: bigint): Promise<GuildMember | null> {
    const member = await this.prisma.guildMember.findUnique({ where: { userId } })
    return member && member.guildId === guildId ? member : null
  }

  async create(data: { guildId: bigint; userId: string; role: string }): Promise<GuildMember> {
    return this.prisma.guildMember.create({ data: { ...data, publicId: generatePublicId() } })
  }

  async updateRole(id: bigint, role: string): Promise<GuildMember> {
    return this.prisma.guildMember.update({ where: { id }, data: { role } })
  }

  async delete(id: bigint): Promise<void> {
    await this.prisma.guildMember.delete({ where: { id } })
  }

  async countByGuild(guildId: bigint): Promise<number> {
    return this.prisma.guildMember.count({ where: { guildId } })
  }
}
