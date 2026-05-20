import type { GuildMember, PrismaClient } from '@/generated/prisma'

export type GuildMemberWithGuildAndMembers = GuildMember & {
  guild: {
    id: string
    name: string
    description: string | null
    factionName: string
    capacity: number
    ownerId: string
    createdAt: Date
    updatedAt: Date
    members: Array<{
      id: string
      userId: string
      role: string
      joinedAt: Date
      user: {
        id: string
        image: string | null
        character: { name: string } | null
      }
    }>
  }
}

export class GuildMemberRepository {
  constructor(private prisma: PrismaClient) {}

  async findByUserId(userId: string): Promise<GuildMember | null> {
    return this.prisma.guildMember.findUnique({ where: { userId } })
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
                    character: { select: { name: true } }
                  }
                }
              },
              orderBy: { joinedAt: 'asc' }
            }
          }
        }
      }
    })
  }

  async findByUserAndGuild(userId: string, guildId: string): Promise<GuildMember | null> {
    const member = await this.prisma.guildMember.findUnique({ where: { userId } })
    return member && member.guildId === guildId ? member : null
  }

  async create(data: { guildId: string; userId: string; role: string }): Promise<GuildMember> {
    return this.prisma.guildMember.create({ data })
  }

  async updateRole(id: string, role: string): Promise<GuildMember> {
    return this.prisma.guildMember.update({ where: { id }, data: { role } })
  }

  async delete(id: string): Promise<void> {
    await this.prisma.guildMember.delete({ where: { id } })
  }

  async countByGuild(guildId: string): Promise<number> {
    return this.prisma.guildMember.count({ where: { guildId } })
  }
}
