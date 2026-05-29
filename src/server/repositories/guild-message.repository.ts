import type { GuildMessage, Prisma, PrismaClient } from '@/generated/prisma'
import { AUTO_HIDE_THRESHOLD } from '@shared/constants/chat-room.constants'
import type { GuildMessageCursorType } from '@shared/schemas/guilds.schemas'
import { resourceNotFound } from '../lib/errors'
import { logger } from '../lib/logger'
import { generatePublicId } from '../lib/public-id'

const log = logger.child({ component: 'guild-message-repository' })

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
    guildId: bigint,
    options: { limit?: number; cursor?: GuildMessageCursorType } = {}
  ): Promise<GuildMessageWithAuthor[]> {
    const limit = options.limit ?? 50
    let cursorWhere: Prisma.GuildMessageWhereInput | undefined
    if (options.cursor) {
      const cursorRow = await this.prisma.guildMessage.findUnique({
        where: { publicId: options.cursor.publicId },
        select: { id: true }
      })
      if (!cursorRow) {
        log.warn({ cursor: options.cursor.publicId }, 'findByGuild: cursor row not found, returning empty page')
        return []
      }
      cursorWhere = {
        OR: [
          { createdAt: { lt: new Date(options.cursor.createdAt) } },
          { createdAt: new Date(options.cursor.createdAt), id: { lt: cursorRow.id } }
        ]
      }
    }

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

  async findById(id: bigint): Promise<GuildMessage | null> {
    return this.prisma.guildMessage.findUnique({ where: { id } })
  }

  async findByPublicId(publicId: string): Promise<GuildMessage | null> {
    return this.prisma.guildMessage.findUnique({ where: { publicId } })
  }

  async create(data: { guildId: bigint; userId: string; content: string }): Promise<GuildMessageWithAuthor> {
    return this.prisma.guildMessage.create({
      data: { ...data, publicId: generatePublicId() },
      include: authorInclude
    })
  }

  async softDelete(id: bigint): Promise<void> {
    await this.prisma.guildMessage.update({
      where: { id },
      data: { deletedAt: new Date() }
    })
  }

  async recordReport(messageId: bigint, reporterId: string): Promise<void> {
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
