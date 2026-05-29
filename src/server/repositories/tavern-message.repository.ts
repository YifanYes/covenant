import type { Prisma, PrismaClient, TavernMessage } from '@/generated/prisma'
import { AUTO_HIDE_THRESHOLD } from '@shared/constants/chat-room.constants'
import type { TavernMessageCursorType } from '@shared/schemas/tavern.schemas'
import { logger } from '../lib/logger'
import { generatePublicId } from '../lib/public-id'

const log = logger.child({ component: 'tavern-message-repository' })

export type TavernMessageWithAuthor = TavernMessage & {
  user: {
    id: string
    image: string | null
    character: { slug: string; name: string } | null
  }
}

const authorInclude = {
  user: {
    select: {
      id: true,
      image: true,
      character: { select: { slug: true, name: true } }
    }
  }
} as const satisfies Prisma.TavernMessageInclude

export class TavernMessageRepository {
  constructor(private prisma: PrismaClient) {}

  async findRecent(
    options: { cursor?: TavernMessageCursorType; limit?: number } = {}
  ): Promise<TavernMessageWithAuthor[]> {
    const limit = options.limit ?? 50
    let cursorWhere: Prisma.TavernMessageWhereInput | undefined
    if (options.cursor) {
      const cursorRow = await this.prisma.tavernMessage.findUnique({
        where: { publicId: options.cursor.publicId },
        select: { id: true }
      })
      if (!cursorRow) {
        log.warn({ cursor: options.cursor.publicId }, 'findRecent: cursor row not found, returning empty page')
        return []
      }
      cursorWhere = {
        OR: [
          { createdAt: { lt: new Date(options.cursor.createdAt) } },
          { createdAt: new Date(options.cursor.createdAt), id: { lt: cursorRow.id } }
        ]
      }
    }

    return this.prisma.tavernMessage.findMany({
      where: {
        deletedAt: null,
        reportCount: { lt: AUTO_HIDE_THRESHOLD },
        ...(cursorWhere ?? {})
      },
      include: authorInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit
    })
  }

  async findByPublicId(publicId: string): Promise<TavernMessage | null> {
    return this.prisma.tavernMessage.findUnique({ where: { publicId } })
  }

  async create(data: {
    userId: string
    characterId: bigint
    content: string
  }): Promise<TavernMessageWithAuthor> {
    return this.prisma.tavernMessage.create({ data: { ...data, publicId: generatePublicId() }, include: authorInclude })
  }

  async softDeleteByPublicIdAndAuthor(publicId: string, userId: string): Promise<number> {
    const result = await this.prisma.tavernMessage.updateMany({
      where: { publicId, userId, deletedAt: null },
      data: { deletedAt: new Date() }
    })
    return result.count
  }
}
