import { randomBytes } from 'node:crypto'
import {
  CAMPAIGN_EVENT_TYPE,
  type CampaignEventType,
  getCampaignTemplate
} from '@shared/constants/guild-campaigns'
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
  UpdateRoleType
} from '@shared/schemas/guilds.schemas'
import { GuildRole, type GuildRoleType } from '@shared/schemas/guilds.schemas'
import { TRPCError } from '@trpc/server'
import type { PrismaClient } from '@/generated/prisma'
import { RESOURCE_NOT_FOUND_OR_FORBIDDEN } from '../lib/errors'
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
export type InviteInvalidReasonType =
  (typeof INVITE_INVALID_REASON)[keyof typeof INVITE_INVALID_REASON]

const DEFAULT_FACTION = 'HOLY_KNIGHTS'
const MAX_ACTIVE_INVITES_PER_GUILD = 5
const PRISMA_UNIQUE_CONSTRAINT = 'P2002'

const notFound = () =>
  new TRPCError({ code: 'NOT_FOUND', message: RESOURCE_NOT_FOUND_OR_FORBIDDEN })

function isRewardPool(value: unknown): value is RewardPoolType {
  return (
    typeof value === 'object' &&
    value !== null &&
    'gold' in value &&
    typeof (value as { gold: unknown }).gold === 'number'
  )
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

  // ========== Campaigns ==========

  async startCampaign(input: StartCampaignType, userId: string) {
    await this.requireRole(input.guildId, userId, [GuildRole.OWNER, GuildRole.OFFICER])

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
   */
  async recordCampaignEvent(userId: string, eventType: CampaignEventType, amount: number): Promise<void> {
    if (amount <= 0) return
    try {
      const membership = await this.guildMemberRepository.findByUserId(userId)
      if (!membership) return

      const campaign = await this.guildRepository.findActiveCampaignByGuild(membership.guildId)
      if (!campaign) return
      if (campaign.eventType !== eventType) return
      if (campaign.expiresAt.getTime() <= Date.now()) return

      await this.applyContribution(campaign.id, userId, amount, campaign.target)
    } catch (error) {
      log.warn({ err: error, userId, eventType, amount }, 'Failed to record campaign event')
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
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Character not found' })
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

  private async applyContribution(
    campaignId: string,
    userId: string,
    amount: number,
    target: number
  ): Promise<void> {
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
