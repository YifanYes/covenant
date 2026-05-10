import type { GuildMessage, PrismaClient } from '@/generated/prisma'

export type GuildMessageWithAuthor = GuildMessage & {
  user: {
    id: string
    name: string | null
    image: string | null
    character: { name: string } | null
  }
}

const authorInclude = {
  user: {
    select: {
      id: true,
      name: true,
      image: true,
      character: { select: { name: true } }
    }
  }
} as const

export class GuildMessageRepository {
  constructor(private prisma: PrismaClient) {}

  async findByGuild(
    guildId: string,
    options: { limit?: number; before?: Date } = {}
  ): Promise<GuildMessageWithAuthor[]> {
    const limit = options.limit ?? 50
    return this.prisma.guildMessage.findMany({
      where: {
        guildId,
        deletedAt: null,
        ...(options.before && { createdAt: { lt: options.before } })
      },
      include: authorInclude,
      orderBy: { createdAt: 'desc' },
      take: limit
    })
  }

  async findById(id: string): Promise<GuildMessage | null> {
    return this.prisma.guildMessage.findUnique({ where: { id } })
  }

  async create(data: { guildId: string; userId: string; content: string }): Promise<GuildMessageWithAuthor> {
    return this.prisma.guildMessage.create({
      data,
      include: authorInclude
    })
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.guildMessage.update({
      where: { id },
      data: { deletedAt: new Date() }
    })
  }
}
