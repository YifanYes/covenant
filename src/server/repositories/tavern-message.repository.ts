import type { Prisma, PrismaClient, TavernMessage } from '@/generated/prisma'
import type { TavernMessageCursorType } from '@shared/schemas/tavern.schemas'

const AUTO_HIDE_THRESHOLD = 3

export type TavernMessageWithAuthor = TavernMessage & {
  user: {
    id: string
    name: string | null
    image: string | null
    character: { id: string; name: string } | null
  }
}

const authorInclude = {
  user: {
    select: {
      id: true,
      name: true,
      image: true,
      character: { select: { id: true, name: true } }
    }
  }
} as const satisfies Prisma.TavernMessageInclude

export class TavernMessageRepository {
  constructor(private prisma: PrismaClient) {}

  async findRecent(
    options: { cursor?: TavernMessageCursorType; limit?: number } = {}
  ): Promise<TavernMessageWithAuthor[]> {
    const limit = options.limit ?? 50
    const cursorWhere: Prisma.TavernMessageWhereInput | undefined = options.cursor
      ? {
          OR: [
            { createdAt: { lt: new Date(options.cursor.createdAt) } },
            { createdAt: new Date(options.cursor.createdAt), id: { lt: options.cursor.id } }
          ]
        }
      : undefined

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

  async create(data: {
    userId: string
    characterId: string
    content: string
  }): Promise<TavernMessageWithAuthor> {
    return this.prisma.tavernMessage.create({ data, include: authorInclude })
  }

  async softDeleteByAuthor(id: string, userId: string): Promise<number> {
    const result = await this.prisma.tavernMessage.updateMany({
      where: { id, userId, deletedAt: null },
      data: { deletedAt: new Date() }
    })
    return result.count
  }
}

export { AUTO_HIDE_THRESHOLD }
