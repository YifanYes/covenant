import type {
  GetTavernMessagesType,
  SendTavernMessageType
} from '@shared/schemas/tavern.schemas'
import { TRPCError } from '@trpc/server'
import type { PrismaClient } from '@/generated/prisma'
import { resourceNotFound } from '../lib/errors'
import { logger } from '../lib/logger'
import { isPrismaUniqueViolation } from '../lib/prisma-errors'
import type { CharacterRepository } from '../repositories/character.repository'
import type { TavernMessageRepository } from '../repositories/tavern-message.repository'

const log = logger.child({ service: 'tavern' })

function isDisabled(): boolean {
  return process.env.TAVERN_DISABLED === '1'
}

export class TavernService {
  constructor(
    private prisma: PrismaClient,
    private tavernMessageRepository: TavernMessageRepository,
    private characterRepository: CharacterRepository
  ) {}

  async getMessages(input: GetTavernMessagesType) {
    const rows = await this.tavernMessageRepository.findRecent({
      cursor: input.cursor,
      limit: input.limit
    })
    return rows.slice().reverse()
  }

  async sendMessage(input: SendTavernMessageType, userId: string) {
    if (isDisabled()) {
      throw new TRPCError({
        code: 'SERVICE_UNAVAILABLE',
        message: 'The Tavern is closed for repairs. Try again later.'
      })
    }

    const trimmed = input.content.trim()
    if (!trimmed) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Message cannot be empty' })
    }

    const character = await this.characterRepository.findByUserId(userId)
    if (!character) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'You must create a character before speaking in the Tavern'
      })
    }

    return this.tavernMessageRepository.create({
      userId,
      characterId: character.id,
      content: trimmed
    })
  }

  async deleteMessage(publicId: string, userId: string) {
    const deleted = await this.tavernMessageRepository.softDeleteByPublicIdAndAuthor(publicId, userId)
    if (deleted === 0) {
      log.warn({ messagePublicId: publicId, userId }, 'deleteMessage: unauthorized or missing tavern message')
      throw resourceNotFound()
    }
    return { message: 'Message deleted' }
  }

  async reportMessage(messagePublicId: string, reporterId: string) {
    try {
      await this.prisma.$transaction(async (tx) => {
        const message = await tx.tavernMessage.findFirst({
          where: { publicId: messagePublicId, deletedAt: null },
          select: { id: true, userId: true }
        })
        if (!message) {
          log.warn({ messagePublicId, reporterId }, 'reportMessage: tavern message not found')
          throw resourceNotFound()
        }
        if (message.userId === reporterId) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'You cannot report your own message' })
        }
        await tx.tavernMessageReport.create({
          data: { messageId: message.id, reporterId }
        })
        const updated = await tx.tavernMessage.updateMany({
          where: { id: message.id, deletedAt: null },
          data: { reportCount: { increment: 1 } }
        })
        if (updated.count === 0) {
          log.warn({ messagePublicId, reporterId }, 'reportMessage: tavern message gone after report insert')
          throw resourceNotFound()
        }
      })
    } catch (error) {
      if (error instanceof TRPCError) throw error
      if (isPrismaUniqueViolation(error)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'You have already reported this message' })
      }
      throw error
    }

    return { message: 'Report received' }
  }
}
