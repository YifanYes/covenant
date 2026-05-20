import type { GuildMessage, Prisma, PrismaClient } from '@/generated/prisma'
import { AUTO_HIDE_THRESHOLD } from '@shared/constants/chat-room.constants'
import type { GuildMessageCursorType } from '@shared/schemas/guilds.schemas'
import { resourceNotFound } from '../lib/errors'

export type GuildMessageWithAuthor = GuildMessage & {
  user: {
    id: string
    image: string | null
    character: { name: string } | null
  }
}

const authorInclude = {
  user: {
    select: {
      id: true,
      image: true,
      character: { select: { name: true } }
    }
  }
} as const satisfies Prisma.GuildMessageInclude

export class GuildMessageRepository {
  constructor(private prisma: PrismaClient) {}

  async findByGuild(
    guildId: string,
    options: { limit?: number; cursor?: GuildMessageCursorType } = {}
  ): Promise<GuildMessageWithAuthor[]> {
    const limit = options.limit ?? 50
    const cursorWhere: Prisma.GuildMessageWhereInput | undefined = options.cursor
      ? {
          OR: [
            { createdAt: { lt: new Date(options.cursor.createdAt) } },
            { createdAt: new Date(options.cursor.createdAt), id: { lt: options.cursor.id } }
          ]
        }
      : undefined

    return this.prisma.guildMessage.findMany({
      where: {
        guildId,
        deletedAt: null,
        reportCount: { lt: AUTO_HIDE_THRESHOLD },
        ...(cursorWhere ?? {})
      },
      include: authorInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
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

  async recordReport(messageId: string, reporterId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.guildMessageReport.create({
        data: { messageId, reporterId }
      })
      const updated = await tx.guildMessage.updateMany({
        where: { id: messageId, deletedAt: null },
        data: { reportCount: { increment: 1 } }
      })
      if (updated.count === 0) throw resourceNotFound()
    })
  }
}
