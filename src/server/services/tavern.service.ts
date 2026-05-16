import type {
  GetTavernMessagesType,
  SendTavernMessageType
} from '@shared/schemas/tavern.schemas'
import { TRPCError } from '@trpc/server'
import type { PrismaClient } from '@/generated/prisma'
import { RESOURCE_NOT_FOUND_OR_FORBIDDEN } from '../lib/errors'
import { logger } from '../lib/logger'
import type { CharacterRepository } from '../repositories/character.repository'
import {
  AUTO_HIDE_THRESHOLD,
  type TavernMessageRepository
} from '../repositories/tavern-message.repository'

const log = logger.child({ service: 'tavern' })

const PRISMA_UNIQUE_CONSTRAINT = 'P2002'

function isDisabled(): boolean {
  return process.env.TAVERN_DISABLED === '1'
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === PRISMA_UNIQUE_CONSTRAINT
  )
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
    return rows.reverse()
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

  async deleteMessage(id: string, userId: string) {
    const deleted = await this.tavernMessageRepository.softDeleteByAuthor(id, userId)
    if (deleted === 0) {
      log.warn({ messageId: id, userId }, 'Unauthorized or missing tavern message delete')
      throw new TRPCError({ code: 'NOT_FOUND', message: RESOURCE_NOT_FOUND_OR_FORBIDDEN })
    }
    return { message: 'Message deleted' }
  }

  async reportMessage(messageId: string, reporterId: string) {
    const message = await this.tavernMessageRepository.findById(messageId)
    if (!message || message.deletedAt) {
      throw new TRPCError({ code: 'NOT_FOUND', message: RESOURCE_NOT_FOUND_OR_FORBIDDEN })
    }
    if (message.userId === reporterId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'You cannot report your own message' })
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.tavernMessageReport.create({
          data: { messageId, reporterId }
        })
        await tx.tavernMessage.update({
          where: { id: messageId },
          data: { reportCount: { increment: 1 } }
        })
      })
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'You have already reported this message' })
      }
      throw error
    }

    return { message: 'Report received' }
  }
}

export { AUTO_HIDE_THRESHOLD }
