import { randomBytes } from 'node:crypto'
import type {
  CreateGuildType,
  CreateInviteType,
  GetMessagesType,
  KickMemberType,
  SendMessageType,
  TransferOwnershipType,
  UpdateGuildType,
  UpdateRoleType
} from '@shared/schemas/guilds.schemas'
import { GuildRole, type GuildRoleType } from '@shared/schemas/guilds.schemas'
import { TRPCError } from '@trpc/server'
import type { PrismaClient } from '@/generated/prisma'
import { logger } from '../lib/logger'
import type { GuildInviteRepository } from '../repositories/guild-invite.repository'
import type { GuildMemberRepository } from '../repositories/guild-member.repository'
import type { GuildMessageRepository } from '../repositories/guild-message.repository'
import type { GuildRepository } from '../repositories/guild.repository'
import type { UserRepository } from '../repositories/user.repository'

const log = logger.child({ service: 'guild' })

export const INVITE_INVALID_REASON = {
  EXPIRED: 'expired',
  REVOKED: 'revoked',
  EXHAUSTED: 'exhausted'
} as const
export type InviteInvalidReasonType =
  (typeof INVITE_INVALID_REASON)[keyof typeof INVITE_INVALID_REASON]

const DEFAULT_FACTION = 'HOLY_KNIGHTS'
const MAX_ACTIVE_INVITES_PER_GUILD = 5
const PRISMA_UNIQUE_CONSTRAINT = 'P2002'

const notFound = () =>
  new TRPCError({ code: 'NOT_FOUND', message: 'Resource not found or access denied' })

export class GuildService {
  constructor(
    private prisma: PrismaClient,
    private guildRepository: GuildRepository,
    private guildMemberRepository: GuildMemberRepository,
    private guildMessageRepository: GuildMessageRepository,
    private guildInviteRepository: GuildInviteRepository,
    private userRepository: UserRepository
  ) {}

  async createGuild(input: CreateGuildType, userId: string) {
    const existing = await this.guildMemberRepository.findByUserId(userId)
    if (existing) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'You already belong to a guild' })
    }

    const user = await this.userRepository.findById(userId)
    const factionName = user?.theme ?? DEFAULT_FACTION

    try {
      return await this.prisma.$transaction(async (tx) => {
        const guild = await tx.guild.create({
          data: {
            name: input.name,
            description: input.description,
            ownerId: userId,
            factionName
          }
        })
        await tx.guildMember.create({
          data: { guildId: guild.id, userId, role: GuildRole.OWNER }
        })
        return guild
      })
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'You already belong to a guild' })
      }
      throw error
    }
  }

  async getMyGuild(userId: string) {
    const member = await this.guildMemberRepository.findByUserIdWithGuildAndMembers(userId)
    if (!member) return null

    return {
      guild: member.guild,
      myRole: member.role as GuildRoleType,
      myMemberId: member.id
    }
  }

  async updateGuild(input: UpdateGuildType, userId: string) {
    await this.requireRole(input.guildId, userId, [GuildRole.OWNER])
    return this.guildRepository.update(input.guildId, {
      name: input.name,
      description: input.description
    })
  }

  async dissolveGuild(guildId: string, userId: string) {
    await this.requireRole(guildId, userId, [GuildRole.OWNER])
    await this.guildRepository.delete(guildId)
    return { message: 'Guild dissolved' }
  }

  async leaveGuild(userId: string) {
    const membership = await this.guildMemberRepository.findByUserId(userId)
    if (!membership) {
      throw notFound()
    }

    const memberCount = await this.guildMemberRepository.countByGuild(membership.guildId)

    if (membership.role === GuildRole.OWNER) {
      if (memberCount > 1) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Transfer ownership before leaving the guild'
        })
      }
      await this.guildRepository.delete(membership.guildId)
      return { dissolved: true }
    }

    await this.guildMemberRepository.delete(membership.id)
    return { dissolved: false }
  }

  async transferOwnership(input: TransferOwnershipType, userId: string) {
    if (input.newOwnerUserId === userId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'You already own this guild' })
    }

    await this.requireRole(input.guildId, userId, [GuildRole.OWNER])

    const target = await this.guildMemberRepository.findByUserAndGuild(input.newOwnerUserId, input.guildId)
    if (!target) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Target user is not in this guild' })
    }

    const currentOwner = await this.guildMemberRepository.findByUserAndGuild(userId, input.guildId)
    if (!currentOwner) throw notFound()

    await this.prisma.$transaction(async (tx) => {
      await tx.guildMember.update({ where: { id: target.id }, data: { role: GuildRole.OWNER } })
      await tx.guildMember.update({ where: { id: currentOwner.id }, data: { role: GuildRole.OFFICER } })
      await tx.guild.update({ where: { id: input.guildId }, data: { ownerId: input.newOwnerUserId } })
    })

    return { message: 'Ownership transferred' }
  }

  async kickMember(input: KickMemberType, userId: string) {
    if (input.targetUserId === userId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Use leave to remove yourself' })
    }

    const actor = await this.requireRole(input.guildId, userId, [GuildRole.OWNER, GuildRole.OFFICER])
    const target = await this.guildMemberRepository.findByUserAndGuild(input.targetUserId, input.guildId)
    if (!target) throw notFound()

    if (target.role === GuildRole.OWNER) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot kick the guild owner' })
    }
    if (actor.role === GuildRole.OFFICER && target.role === GuildRole.OFFICER) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Officers cannot kick other officers' })
    }

    await this.guildMemberRepository.delete(target.id)
    return { message: 'Member removed' }
  }

  async updateRole(input: UpdateRoleType, userId: string) {
    if (input.targetUserId === userId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'You cannot change your own role' })
    }
    await this.requireRole(input.guildId, userId, [GuildRole.OWNER])

    const target = await this.guildMemberRepository.findByUserAndGuild(input.targetUserId, input.guildId)
    if (!target) throw notFound()
    if (target.role === GuildRole.OWNER) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot change the owner role here' })
    }

    await this.guildMemberRepository.updateRole(target.id, input.role)
    return { message: 'Role updated' }
  }

  async createInvite(input: CreateInviteType, userId: string) {
    await this.requireRole(input.guildId, userId, [GuildRole.OWNER, GuildRole.OFFICER])

    const activeCount = await this.guildInviteRepository.countActiveByGuild(input.guildId)
    if (activeCount >= MAX_ACTIVE_INVITES_PER_GUILD) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Active invite limit reached (${MAX_ACTIVE_INVITES_PER_GUILD}). Revoke one before creating another.`
      })
    }

    const token = randomBytes(24).toString('hex')
    const expiresAt = new Date(Date.now() + input.expiresInHours * 60 * 60 * 1000)

    return this.guildInviteRepository.create({
      guildId: input.guildId,
      token,
      createdBy: userId,
      expiresAt,
      maxUses: input.maxUses
    })
  }

  async revokeInvite(inviteId: string, userId: string) {
    const invite = await this.guildInviteRepository.findById(inviteId)
    if (!invite) throw notFound()
    await this.requireRole(invite.guildId, userId, [GuildRole.OWNER, GuildRole.OFFICER])
    await this.guildInviteRepository.revoke(inviteId)
    return { message: 'Invite revoked' }
  }

  async listInvites(guildId: string, userId: string) {
    await this.requireRole(guildId, userId, [GuildRole.OWNER, GuildRole.OFFICER])
    return this.guildInviteRepository.findByGuild(guildId)
  }

  async getInvitePreview(token: string) {
    const invite = await this.guildInviteRepository.findByToken(token)
    if (!invite) throw notFound()

    const now = new Date()
    const expired = invite.expiresAt < now
    const revoked = invite.revokedAt !== null
    const exhausted = invite.maxUses != null && invite.usedCount >= invite.maxUses
    const valid = !expired && !revoked && !exhausted

    let reason: InviteInvalidReasonType | null = null
    if (!valid) {
      if (expired) reason = INVITE_INVALID_REASON.EXPIRED
      else if (revoked) reason = INVITE_INVALID_REASON.REVOKED
      else if (exhausted) reason = INVITE_INVALID_REASON.EXHAUSTED
    }

    const guild = await this.guildRepository.findById(invite.guildId)
    if (!guild) throw notFound()
    const memberCount = await this.guildMemberRepository.countByGuild(guild.id)

    return {
      valid,
      reason,
      guild: {
        id: guild.id,
        name: guild.name,
        description: guild.description,
        factionName: guild.factionName,
        memberCount,
        capacity: guild.capacity
      }
    }
  }

  async joinByToken(token: string, userId: string) {
    const existing = await this.guildMemberRepository.findByUserId(userId)
    if (existing) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'You already belong to a guild' })
    }

    const invite = await this.guildInviteRepository.findByToken(token)
    if (!invite) throw notFound()

    const now = new Date()
    if (invite.revokedAt) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invite has been revoked' })
    }
    if (invite.expiresAt < now) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invite has expired' })
    }
    if (invite.maxUses != null && invite.usedCount >= invite.maxUses) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invite has reached its use limit' })
    }

    const guild = await this.guildRepository.findById(invite.guildId)
    if (!guild) throw notFound()

    const inviteUsedCondition =
      invite.maxUses == null
        ? {}
        : { usedCount: { lt: invite.maxUses } }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const claim = await tx.guildInvite.updateMany({
          where: {
            id: invite.id,
            revokedAt: null,
            expiresAt: { gt: now },
            ...inviteUsedCondition
          },
          data: { usedCount: { increment: 1 } }
        })
        if (claim.count === 0) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invite no longer valid' })
        }

        const memberCount = await tx.guildMember.count({ where: { guildId: guild.id } })
        if (memberCount >= guild.capacity) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Guild is at capacity' })
        }

        await tx.guildMember.create({
          data: { guildId: guild.id, userId, role: GuildRole.MEMBER }
        })

        return { guildId: guild.id }
      })
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'You already belong to a guild' })
      }
      throw error
    }
  }

  async getMessages(input: GetMessagesType, userId: string) {
    await this.requireMembership(input.guildId, userId)
    const before = input.before ? new Date(input.before) : undefined
    const messages = await this.guildMessageRepository.findByGuild(input.guildId, {
      limit: input.limit,
      before
    })
    return messages.reverse()
  }

  async sendMessage(input: SendMessageType, userId: string) {
    await this.requireMembership(input.guildId, userId)
    const trimmed = input.content.trim()
    if (!trimmed) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Message cannot be empty' })
    }
    return this.guildMessageRepository.create({
      guildId: input.guildId,
      userId,
      content: trimmed
    })
  }

  async deleteMessage(messageId: string, userId: string) {
    const message = await this.guildMessageRepository.findById(messageId)
    if (!message || message.deletedAt) throw notFound()

    const actor = await this.guildMemberRepository.findByUserAndGuild(userId, message.guildId)
    if (!actor) throw notFound()

    const isAuthor = message.userId === userId
    const isModerator = actor.role === GuildRole.OWNER || actor.role === GuildRole.OFFICER
    if (!isAuthor && !isModerator) {
      log.warn({ messageId, userId }, 'Unauthorized guild message delete attempt')
      throw notFound()
    }

    await this.guildMessageRepository.softDelete(messageId)
    return { message: 'Message deleted' }
  }

  private async requireMembership(guildId: string, userId: string) {
    const member = await this.guildMemberRepository.findByUserAndGuild(userId, guildId)
    if (!member) {
      log.warn({ guildId, userId }, 'Non-member attempted guild access')
      throw notFound()
    }
    return member
  }

  private async requireRole(guildId: string, userId: string, allowedRoles: GuildRoleType[]) {
    const member = await this.requireMembership(guildId, userId)
    if (!allowedRoles.includes(member.role as GuildRoleType)) {
      log.warn({ guildId, userId, role: member.role, allowedRoles }, 'Insufficient guild role')
      throw notFound()
    }
    return member
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === PRISMA_UNIQUE_CONSTRAINT
  )
}
