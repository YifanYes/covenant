import type { PrismaClient } from '@/generated/prisma'
import {
  CAMPAIGN_EVENT_TYPE,
  type CampaignEventType,
  getCampaignTemplate
} from '@/shared/constants/guild-campaigns.constants'
import {
  computeContributionPoints,
  getGuildGoldMultiplier,
  getGuildTier,
  getNextTierThreshold,
  MAX_GUILD_TIER
} from '@/shared/constants/guild-progression.constants'
import {
  GUILD_DESCRIPTION_MAX_LENGTH,
  GUILD_TITLE_MAX_LENGTH,
  GUILD_TITLE_POOL_MAX_SIZE
} from '@shared/constants/guild.constants'
import { sanitizeRichText } from '@shared/lib/sanitize-rich-text.lib'
import type {
  CreateGuildType,
  CreateInviteType,
  GetMessagesType,
  KickMemberType,
  RewardPoolType,
  SendMessageType,
  StartCampaignType,
  TransferOwnershipType,
  UpdateGuildType,
  UpdateMemberTitleType,
  UpdateRoleType,
  UpdateTitlePoolType
} from '@shared/schemas/guilds.schemas'
import { GuildRole, type GuildRoleType } from '@shared/schemas/guilds.schemas'
import { TRPCError } from '@trpc/server'
import { randomBytes } from 'node:crypto'
import { resourceNotFound } from '../lib/errors'
import { logger } from '../lib/logger'
import type { CharacterRepository } from '../repositories/character.repository'
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
export type InviteInvalidReasonType = (typeof INVITE_INVALID_REASON)[keyof typeof INVITE_INVALID_REASON]

const DEFAULT_FACTION = 'HOLY_KNIGHTS'
const MAX_ACTIVE_INVITES_PER_GUILD = 5
const PRISMA_UNIQUE_CONSTRAINT = 'P2002'

const notFound = resourceNotFound

function isRewardPool(value: unknown): value is RewardPoolType {
  return (
    typeof value === 'object' &&
    value !== null &&
    'gold' in value &&
    typeof (value as { gold: unknown }).gold === 'number'
  )
}

function sanitizeGuildDescription(description: string): string {
  const sanitized = sanitizeRichText(description)
  const plain = sanitized.replace(/<[^>]*>/g, '')
  if (plain.length > GUILD_DESCRIPTION_MAX_LENGTH) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Description exceeds ${GUILD_DESCRIPTION_MAX_LENGTH} characters`
    })
  }
  return sanitized
}

export class GuildService {
  constructor(
    private prisma: PrismaClient,
    private guildRepository: GuildRepository,
    private guildMemberRepository: GuildMemberRepository,
    private guildMessageRepository: GuildMessageRepository,
    private guildInviteRepository: GuildInviteRepository,
    private userRepository: UserRepository,
    private characterRepository: CharacterRepository
  ) {}

  async createGuild(input: CreateGuildType, userId: string) {
    const existing = await this.guildMemberRepository.findByUserId(userId)
    if (existing) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'You already belong to a guild' })
    }

    const user = await this.userRepository.findById(userId)
    const factionName = user?.userSettings?.theme ?? DEFAULT_FACTION

    const description = input.description !== undefined ? sanitizeGuildDescription(input.description) : undefined

    try {
      return await this.prisma.$transaction(async (tx) => {
        const guild = await tx.guild.create({
          data: {
            name: input.name,
            description,
            ownerId: userId,
            factionName
          }
        })
        await tx.guildMember.create({
          data: { guildId: guild.id, userId, role: GuildRole.GUILD_MASTER }
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
    await this.requireRole(input.guildId, userId, [GuildRole.GUILD_MASTER])

    const description = input.description !== undefined ? sanitizeGuildDescription(input.description) : undefined

    return this.guildRepository.update(input.guildId, {
      name: input.name,
      description
    })
  }

  async dissolveGuild(guildId: string, userId: string) {
    await this.requireRole(guildId, userId, [GuildRole.GUILD_MASTER])
    const memberUserIds = await this.guildMemberRepository.findUserIdsByGuild(guildId)
    await this.prisma.$transaction(async (tx) => {
      if (memberUserIds.length > 0) {
        await tx.character.updateMany({
          where: { userId: { in: memberUserIds } },
          data: { title: null }
        })
      }
      await tx.guild.delete({ where: { id: guildId } })
    })
    return { message: 'Guild dissolved' }
  }

  async leaveGuild(userId: string) {
    const membership = await this.guildMemberRepository.findByUserId(userId)
    if (!membership) {
      throw notFound()
    }

    const memberCount = await this.guildMemberRepository.countByGuild(membership.guildId)

    if (membership.role === GuildRole.GUILD_MASTER) {
      if (memberCount > 1) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Transfer ownership before leaving the guild'
        })
      }
      await this.prisma.$transaction(async (tx) => {
        await tx.character.updateMany({ where: { userId }, data: { title: null } })
        await tx.guild.delete({ where: { id: membership.guildId } })
      })
      return { dissolved: true }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.character.updateMany({ where: { userId }, data: { title: null } })
      await tx.guildMember.delete({ where: { id: membership.id } })
    })
    return { dissolved: false }
  }

  async transferOwnership(input: TransferOwnershipType, userId: string) {
    if (input.newOwnerUserId === userId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'You already own this guild' })
    }

    await this.requireRole(input.guildId, userId, [GuildRole.GUILD_MASTER])

    const target = await this.guildMemberRepository.findByUserAndGuild(input.newOwnerUserId, input.guildId)
    if (!target) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Target user is not in this guild' })
    }

    const currentOwner = await this.guildMemberRepository.findByUserAndGuild(userId, input.guildId)
    if (!currentOwner) throw notFound()

    await this.prisma.$transaction(async (tx) => {
      await tx.guildMember.update({ where: { id: target.id }, data: { role: GuildRole.GUILD_MASTER } })
      await tx.guildMember.update({ where: { id: currentOwner.id }, data: { role: GuildRole.CAPTAIN } })
      await tx.guild.update({ where: { id: input.guildId }, data: { ownerId: input.newOwnerUserId } })
    })

    return { message: 'Ownership transferred' }
  }

  async kickMember(input: KickMemberType, userId: string) {
    if (input.targetUserId === userId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Use leave to remove yourself' })
    }

    const actor = await this.requireRole(input.guildId, userId, [GuildRole.GUILD_MASTER, GuildRole.CAPTAIN])
    const target = await this.guildMemberRepository.findByUserAndGuild(input.targetUserId, input.guildId)
    if (!target) throw notFound()

    if (target.role === GuildRole.GUILD_MASTER) {
      log.warn(
        { guildId: input.guildId, actorId: userId, targetId: input.targetUserId },
        'Attempt to kick guild master'
      )
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot kick the guild master' })
    }
    if (actor.role === GuildRole.CAPTAIN && target.role === GuildRole.CAPTAIN) {
      log.warn(
        { guildId: input.guildId, actorId: userId, targetId: input.targetUserId },
        'Captain attempted to kick another captain'
      )
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Captains cannot kick other captains' })
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.character.updateMany({ where: { userId: target.userId }, data: { title: null } })
      await tx.guildMember.delete({ where: { id: target.id } })
    })
    return { message: 'Member removed' }
  }

  async updateRole(input: UpdateRoleType, userId: string) {
    if (input.targetUserId === userId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'You cannot change your own role' })
    }
    await this.requireRole(input.guildId, userId, [GuildRole.GUILD_MASTER])

    const target = await this.guildMemberRepository.findByUserAndGuild(input.targetUserId, input.guildId)
    if (!target) throw notFound()
    if (target.role === GuildRole.GUILD_MASTER) {
      log.warn(
        { guildId: input.guildId, actorId: userId, targetId: input.targetUserId },
        'Attempt to change guild master role via updateRole'
      )
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot change the guild master role here' })
    }

    await this.guildMemberRepository.updateRole(target.id, input.role)
    return { message: 'Role updated' }
  }

  async updateTitlePool(input: UpdateTitlePoolType, userId: string) {
    await this.requireRole(input.guildId, userId, [GuildRole.GUILD_MASTER, GuildRole.CAPTAIN])

    if (input.titles.length > GUILD_TITLE_POOL_MAX_SIZE) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Title pool cannot exceed ${GUILD_TITLE_POOL_MAX_SIZE} entries`
      })
    }
    if (input.titles.some((title) => title.length === 0 || title.length > GUILD_TITLE_MAX_LENGTH)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Each title must be 1-${GUILD_TITLE_MAX_LENGTH} characters`
      })
    }

    await this.prisma.$transaction(async (tx) => {
      const guild = await tx.guild.findUnique({
        where: { id: input.guildId },
        select: { availableTitles: true }
      })
      if (!guild) throw notFound()
      const removed = guild.availableTitles.filter((t) => !input.titles.includes(t))

      await tx.guild.update({
        where: { id: input.guildId },
        data: { availableTitles: input.titles }
      })
      if (removed.length > 0) {
        const memberRows = await tx.guildMember.findMany({
          where: { guildId: input.guildId },
          select: { userId: true }
        })
        const userIds = memberRows.map((r) => r.userId)
        if (userIds.length > 0) {
          await tx.character.updateMany({
            where: { userId: { in: userIds }, title: { in: removed } },
            data: { title: null }
          })
        }
      }
    })

    return { titles: input.titles }
  }

  async updateMemberTitle(input: UpdateMemberTitleType, userId: string) {
    const actor = await this.requireRole(input.guildId, userId, [GuildRole.GUILD_MASTER, GuildRole.CAPTAIN])

    const guild = await this.guildRepository.findById(input.guildId)
    if (!guild) throw notFound()

    if (input.title !== null && !guild.availableTitles.includes(input.title)) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Title is not in the guild title pool' })
    }

    const target = await this.guildMemberRepository.findById(input.memberId)
    if (!target || target.guildId !== input.guildId) throw notFound()

    if (target.userId === userId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'You cannot title yourself' })
    }
    if (target.role === GuildRole.GUILD_MASTER) {
      log.warn(
        { guildId: input.guildId, actorId: userId, targetUserId: target.userId },
        'Attempt to retitle guild master'
      )
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot retitle the guild master' })
    }
    if (actor.role === GuildRole.CAPTAIN && target.role === GuildRole.CAPTAIN) {
      log.warn(
        { guildId: input.guildId, actorId: userId, targetUserId: target.userId },
        'Captain attempted to retitle another captain'
      )
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Captains cannot retitle other captains' })
    }

    const character = await this.characterRepository.findByUserId(target.userId)
    if (!character) throw notFound()

    await this.characterRepository.updateTitle(character.id, input.title)
    return { title: input.title }
  }

  async createInvite(input: CreateInviteType, userId: string) {
    await this.requireRole(input.guildId, userId, [GuildRole.GUILD_MASTER, GuildRole.CAPTAIN])

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
    await this.requireRole(invite.guildId, userId, [GuildRole.GUILD_MASTER, GuildRole.CAPTAIN])
    await this.guildInviteRepository.revoke(inviteId)
    return { message: 'Invite revoked' }
  }

  async listInvites(guildId: string, userId: string) {
    await this.requireRole(guildId, userId, [GuildRole.GUILD_MASTER, GuildRole.CAPTAIN])
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

    const inviteUsedCondition = invite.maxUses == null ? {} : { usedCount: { lt: invite.maxUses } }

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
    const messages = await this.guildMessageRepository.findByGuild(input.guildId, {
      limit: input.limit,
      cursor: input.cursor
    })
    return messages.slice().reverse()
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
    const isModerator = actor.role === GuildRole.GUILD_MASTER || actor.role === GuildRole.CAPTAIN
    if (!isAuthor && !isModerator) {
      log.warn({ messageId, userId }, 'Unauthorized guild message delete attempt')
      throw notFound()
    }

    await this.guildMessageRepository.softDelete(messageId)
    return { message: 'Message deleted' }
  }

  async reportMessage(messageId: string, reporterId: string) {
    const message = await this.guildMessageRepository.findById(messageId)
    if (!message || message.deletedAt) {
      log.warn({ messageId, reporterId }, 'reportMessage: guild message not found')
      throw notFound()
    }
    if (message.userId === reporterId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'You cannot report your own message' })
    }

    const membership = await this.guildMemberRepository.findByUserAndGuild(reporterId, message.guildId)
    if (!membership) {
      log.warn({ messageId, reporterId }, 'reportMessage: non-member attempted to report')
      throw notFound()
    }

    try {
      await this.guildMessageRepository.recordReport(messageId, reporterId)
    } catch (error) {
      if (error instanceof TRPCError) {
        if (error.code === 'NOT_FOUND') {
          log.warn({ messageId, reporterId }, 'reportMessage: guild message gone during report tx')
        }
        throw error
      }
      if (isUniqueConstraintError(error)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'You have already reported this message' })
      }
      throw error
    }

    return { message: 'Report received' }
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

  // ========== Campaigns ==========

  async startCampaign(input: StartCampaignType, userId: string) {
    await this.requireRole(input.guildId, userId, [GuildRole.GUILD_MASTER, GuildRole.CAPTAIN])

    const template = getCampaignTemplate(input.templateId)
    if (!template) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Unknown campaign template' })
    }

    const active = await this.guildRepository.findActiveCampaignByGuild(input.guildId)
    if (active) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'A campaign is already active. Finish it before starting another.'
      })
    }

    const expiresAt = new Date(Date.now() + template.durationDays * 24 * 60 * 60 * 1000)

    const created = await this.guildRepository.createCampaign({
      guildId: input.guildId,
      templateId: template.id,
      eventType: template.eventType,
      target: template.defaultTarget,
      rewardPool: template.rewardPool,
      startedBy: userId,
      expiresAt
    })

    return {
      id: created.id,
      guildId: created.guildId,
      templateId: created.templateId,
      eventType: created.eventType,
      target: created.target,
      progress: created.progress,
      rewardPool: template.rewardPool,
      startedAt: created.startedAt,
      expiresAt: created.expiresAt,
      completedAt: created.completedAt
    }
  }

  async getCurrentCampaign(guildId: string, userId: string) {
    await this.requireMembership(guildId, userId)
    const campaign = await this.guildRepository.findCurrentCampaignByGuildWithEntries(guildId)
    if (!campaign) return null
    return this.shapeCampaign(campaign, userId)
  }

  async listCampaignHistory(guildId: string, userId: string) {
    await this.requireMembership(guildId, userId)
    const campaigns = await this.guildRepository.listCampaignsByGuild(guildId, 20)
    return campaigns.map((c) => ({
      id: c.id,
      templateId: c.templateId,
      eventType: c.eventType,
      target: c.target,
      progress: c.progress,
      startedAt: c.startedAt,
      expiresAt: c.expiresAt,
      completedAt: c.completedAt,
      rewardPool: isRewardPool(c.rewardPool) ? c.rewardPool : { gold: 0 }
    }))
  }

  /**
   * Record a contribution event. Non-fatal: any error here is logged and swallowed
   * so user-facing actions (habit completion, kill, etc.) never fail due to campaign tracking.
   *
   * Two effects per event:
   * 1. Always-on guild progression — bumps `Guild.totalContribution` and advances `Guild.tier`
   *    when a new threshold is crossed. Independent of whether a campaign is active.
   * 2. Active-campaign progress — only when an active campaign matches the eventType.
   */
  async recordCampaignEvent(userId: string, eventType: CampaignEventType, amount: number): Promise<void> {
    if (amount <= 0) return
    let membership: { guildId: string } | null = null
    try {
      membership = await this.guildMemberRepository.findByUserId(userId)
    } catch (error) {
      log.warn({ err: error, userId, eventType, amount }, 'Failed to look up guild membership')
      return
    }
    if (!membership) return
    await this.recordEventForGuild(membership.guildId, userId, eventType, amount)
  }

  /**
   * Combat hot-path: a single membership+guild lookup that both multiplies gold by
   * the guild-tier multiplier and records ENEMY_KILL + GOLD_EARNED contribution and
   * campaign progress. Folds what used to be three independent member lookups
   * (`getGoldMultiplier` + two `recordCampaignEvent` calls) into one round-trip pair.
   *
   * Non-fatal: a failure in the membership lookup falls back to the base gold and
   * skips event recording entirely. Per-event errors are still logged independently
   * inside `recordEventForGuild`.
   */
  async applyCombatRewards(userId: string, baseGold: number): Promise<number> {
    let membership: { guildId: string; tier: number } | null = null
    try {
      const member = await this.guildMemberRepository.findByUserId(userId)
      if (!member) return baseGold
      const guild = await this.guildRepository.findById(member.guildId)
      if (!guild) {
        log.warn({ userId, guildId: member.guildId }, 'Guild member references missing guild')
        return baseGold
      }
      membership = { guildId: guild.id, tier: guild.tier }
    } catch (error) {
      log.warn({ err: error, userId }, 'Failed to load guild membership for combat rewards')
      return baseGold
    }

    const multipliedGold = Math.floor(baseGold * getGuildGoldMultiplier(membership.tier))

    await this.recordEventForGuild(membership.guildId, userId, CAMPAIGN_EVENT_TYPE.ENEMY_KILL, 1)
    if (multipliedGold > 0) {
      // Contribution bump uses post-multiplier gold (bounded +20% feedback loop,
      // accepted per Phase 3 spec). Campaign progress uses pre-multiplier baseGold
      // so a GOLD_EARNED campaign target is not affected by guild tier — preserves
      // the Phase 2 contract.
      await this.recordEventForGuild(
        membership.guildId,
        userId,
        CAMPAIGN_EVENT_TYPE.GOLD_EARNED,
        multipliedGold,
        baseGold
      )
    }

    return multipliedGold
  }

  /**
   * Two-stage event recording on a known guild: always-on contribution bump, then
   * active-campaign progress when the event type matches. Each stage has its own
   * try/catch so a failure in one path doesn't block the other.
   *
   * `contributionAmount` feeds `Guild.totalContribution`; `campaignAmount` feeds
   * the active campaign target. They diverge only for GOLD_EARNED from combat,
   * where the gold multiplier should bump contribution but not skew Phase 2
   * campaign progress.
   */
  private async recordEventForGuild(
    guildId: string,
    userId: string,
    eventType: CampaignEventType,
    contributionAmount: number,
    campaignAmount: number = contributionAmount
  ): Promise<void> {
    try {
      const points = computeContributionPoints(eventType, contributionAmount)
      if (points > 0) {
        await this.addGuildContribution(guildId, points)
      }
    } catch (error) {
      log.warn(
        { err: error, userId, guildId, eventType, amount: contributionAmount },
        'Failed to bump guild contribution'
      )
    }

    try {
      const campaign = await this.guildRepository.findActiveCampaignByGuild(guildId)
      if (!campaign) return
      if (campaign.eventType !== eventType) return
      if (campaign.expiresAt.getTime() <= Date.now()) return

      await this.applyContribution(campaign.id, userId, campaignAmount, campaign.target)
    } catch (error) {
      log.warn({ err: error, userId, guildId, eventType, amount: campaignAmount }, 'Failed to record campaign event')
    }
  }

  /**
   * Atomic contribution increment + tier compare-and-swap. Tier is recomputed from
   * the post-increment total via the pure `getGuildTier()` (handles multi-threshold
   * jumps). The conditional `updateMany` on `tier < computed` elects one winner
   * across concurrent crossings, matching the joinByToken CAS pattern. The two
   * statements are non-transactional; if the CAS fails after the increment lands,
   * tier self-heals on the next event.
   */
  private async addGuildContribution(guildId: string, points: number): Promise<void> {
    const updated = await this.prisma.guild.update({
      where: { id: guildId },
      data: { totalContribution: { increment: points } },
      select: { tier: true, totalContribution: true }
    })
    const newTier = getGuildTier(updated.totalContribution)
    if (newTier > updated.tier) {
      await this.prisma.guild.updateMany({
        where: { id: guildId, tier: { lt: newTier } },
        data: { tier: newTier }
      })
    }
  }

  /** Tier + progression summary for the user's guild, or null if guildless. */
  async getMyProgression(userId: string) {
    const membership = await this.guildMemberRepository.findByUserId(userId)
    if (!membership) return null
    const guild = await this.guildRepository.findById(membership.guildId)
    if (!guild) return null
    const tier = guild.tier
    const nextThreshold = getNextTierThreshold(tier)
    return {
      guildId: guild.id,
      tier,
      maxTier: MAX_GUILD_TIER,
      totalContribution: guild.totalContribution,
      nextThreshold,
      goldMultiplier: getGuildGoldMultiplier(tier)
    }
  }

  async claimCampaignReward(campaignId: string, userId: string) {
    const campaign = await this.guildRepository.findCampaignById(campaignId)
    if (!campaign) throw notFound()

    const member = await this.guildMemberRepository.findByUserAndGuild(userId, campaign.guildId)
    if (!member) throw notFound()

    if (!campaign.completedAt) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Campaign has not been completed yet' })
    }

    const character = await this.characterRepository.findByUserId(userId)
    if (!character) {
      log.warn({ userId, campaignId }, 'claimCampaignReward: character not found')
      throw notFound()
    }

    return this.prisma.$transaction(async (tx) => {
      // Atomic claim: only entries with a snapshotted goldClaimed > 0 (stamped at completion)
      // and not yet claimed succeed. Late contributors created after completion have
      // goldClaimed = 0 and are excluded.
      const claim = await tx.guildCampaignProgress.updateMany({
        where: {
          campaignId,
          userId,
          claimedAt: null,
          goldClaimed: { gt: 0 }
        },
        data: { claimedAt: new Date() }
      })

      if (claim.count === 0) {
        const existing = await tx.guildCampaignProgress.findUnique({
          where: { campaignId_userId: { campaignId, userId } }
        })
        if (!existing) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'You did not contribute to this campaign'
          })
        }
        if (existing.goldClaimed <= 0) {
          if (existing.contribution > 0) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Contributed after the target was reached — no share available'
            })
          }
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'You did not contribute to this campaign'
          })
        }
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Reward already claimed' })
      }

      const entry = await tx.guildCampaignProgress.findUnique({
        where: { campaignId_userId: { campaignId, userId } }
      })
      const share = entry?.goldClaimed ?? 0

      if (share > 0) {
        await tx.character.update({
          where: { id: character.id },
          data: { gold: { increment: share } }
        })
      }

      return { goldClaimed: share }
    })
  }

  private shapeCampaign(
    campaign: Awaited<ReturnType<GuildRepository['findCurrentCampaignByGuildWithEntries']>>,
    userId: string
  ) {
    if (!campaign) return null

    const pool = isRewardPool(campaign.rewardPool) ? campaign.rewardPool : { gold: 0 }
    const myEntry = campaign.progressEntries.find((e) => e.userId === userId) ?? null
    const leaderboard = [...campaign.progressEntries]
      .filter((e) => e.contribution > 0)
      .sort((a, b) => b.contribution - a.contribution)
      .slice(0, 25)
      .map((e) => ({
        userId: e.userId,
        contribution: e.contribution,
        claimedAt: e.claimedAt
      }))

    return {
      id: campaign.id,
      guildId: campaign.guildId,
      templateId: campaign.templateId,
      eventType: campaign.eventType,
      target: campaign.target,
      progress: campaign.progress,
      rewardPool: pool,
      startedAt: campaign.startedAt,
      expiresAt: campaign.expiresAt,
      completedAt: campaign.completedAt,
      contributorCount: campaign.contributorCount,
      leaderboard,
      myContribution: myEntry?.contribution ?? 0,
      myClaimedAt: myEntry?.claimedAt ?? null,
      myShare: myEntry?.goldClaimed ?? 0,
      isExpired: !campaign.completedAt && campaign.expiresAt.getTime() <= Date.now()
    }
  }

  private async applyContribution(campaignId: string, userId: string, amount: number, target: number): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const guardCampaign = await tx.guildCampaign.findUnique({
        where: { id: campaignId },
        select: { completedAt: true, expiresAt: true, progress: true, target: true, rewardPool: true }
      })
      if (!guardCampaign) return
      if (guardCampaign.completedAt) return
      if (guardCampaign.expiresAt.getTime() <= Date.now()) return

      await tx.guildCampaignProgress.upsert({
        where: { campaignId_userId: { campaignId, userId } },
        create: { campaignId, userId, contribution: amount },
        update: { contribution: { increment: amount } }
      })

      const updated = await tx.guildCampaign.update({
        where: { id: campaignId },
        data: { progress: { increment: amount } },
        select: { id: true, progress: true, completedAt: true }
      })

      if (!updated.completedAt && updated.progress >= target) {
        // Race-safe completion: conditional updateMany on completedAt: null elects one
        // winner. Winner enumerates contributors and stamps goldClaimed onto each entry.
        // Late contributions whose tx began before this completion still see completedAt
        // == null in their guard read; their upsert may insert/update a row, but it will
        // have goldClaimed = 0 (default) and be excluded from claims.
        const claimed = await tx.guildCampaign.updateMany({
          where: { id: campaignId, completedAt: null },
          data: { completedAt: new Date() }
        })

        if (claimed.count > 0) {
          const pool = isRewardPool(guardCampaign.rewardPool) ? guardCampaign.rewardPool : { gold: 0 }
          const contributorEntries = await tx.guildCampaignProgress.findMany({
            where: { campaignId, contribution: { gt: 0 } },
            select: { id: true }
          })
          const count = contributorEntries.length
          const share = count > 0 ? Math.floor(pool.gold / count) : 0

          if (count > 0) {
            await tx.guildCampaignProgress.updateMany({
              where: { campaignId, contribution: { gt: 0 } },
              data: { goldClaimed: share }
            })
          }

          await tx.guildCampaign.update({
            where: { id: campaignId },
            data: { contributorCount: count }
          })
        }
      }
    })
  }
}

export { CAMPAIGN_EVENT_TYPE }

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === PRISMA_UNIQUE_CONSTRAINT
  )
}
