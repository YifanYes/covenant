import { CAMPAIGN_EVENT_TYPE } from '@shared/constants/guild-campaigns'
import {
  computeContributionPoints,
  getGuildGoldMultiplier,
  getGuildTier,
  getNextTierThreshold,
  MAX_GUILD_TIER
} from '@shared/constants/guild-progression'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GuildService } from '../../services/guild.service'

describe('Guild progression (Phase 3)', () => {
  describe('pure helpers', () => {
    it('getGuildTier maps thresholds correctly', () => {
      expect(getGuildTier(0)).toBe(1)
      expect(getGuildTier(999)).toBe(1)
      expect(getGuildTier(1000)).toBe(2)
      expect(getGuildTier(4999)).toBe(2)
      expect(getGuildTier(5000)).toBe(3)
      expect(getGuildTier(14999)).toBe(3)
      expect(getGuildTier(15000)).toBe(4)
      expect(getGuildTier(39999)).toBe(4)
      expect(getGuildTier(40000)).toBe(5)
      expect(getGuildTier(999999)).toBe(5)
    })

    it('getGuildTier handles multi-threshold jumps in a single bump', () => {
      // Crossing T2, T3, and T4 in one event
      expect(getGuildTier(20000)).toBe(4)
    })

    it('getNextTierThreshold returns next or null at max', () => {
      expect(getNextTierThreshold(1)).toBe(1000)
      expect(getNextTierThreshold(4)).toBe(40000)
      expect(getNextTierThreshold(MAX_GUILD_TIER)).toBeNull()
    })

    it('getGuildGoldMultiplier: tier 1 = 1.0, tier 5 = 1.20', () => {
      expect(getGuildGoldMultiplier(1)).toBeCloseTo(1.0)
      expect(getGuildGoldMultiplier(2)).toBeCloseTo(1.05)
      expect(getGuildGoldMultiplier(3)).toBeCloseTo(1.1)
      expect(getGuildGoldMultiplier(4)).toBeCloseTo(1.15)
      expect(getGuildGoldMultiplier(5)).toBeCloseTo(1.2)
    })

    it('computeContributionPoints weights events to normalise gold vs kills', () => {
      // 1 kill = 5 pts; 1 habit = 3 pts; 1 task = 4 pts
      expect(computeContributionPoints(CAMPAIGN_EVENT_TYPE.ENEMY_KILL, 1)).toBe(5)
      expect(computeContributionPoints(CAMPAIGN_EVENT_TYPE.HABIT_COMPLETION, 1)).toBe(3)
      expect(computeContributionPoints(CAMPAIGN_EVENT_TYPE.TASK_COMPLETION, 1)).toBe(4)
      // 25 gold => floor(25/5) * 1 = 5 pts (roughly parity with one kill)
      expect(computeContributionPoints(CAMPAIGN_EVENT_TYPE.GOLD_EARNED, 25)).toBe(5)
      expect(computeContributionPoints(CAMPAIGN_EVENT_TYPE.GOLD_EARNED, 4)).toBe(0)
      expect(computeContributionPoints(CAMPAIGN_EVENT_TYPE.ENEMY_KILL, 0)).toBe(0)
    })
  })

  describe('GuildService.recordCampaignEvent — always-on contribution', () => {
    let service: GuildService
    let prisma: any
    let memberRepo: any
    let guildRepo: any

    beforeEach(() => {
      vi.clearAllMocks()
      prisma = {
        $transaction: vi.fn(async (fn: any) => fn({})),
        guild: {
          update: vi.fn().mockResolvedValue({ tier: 1, totalContribution: 5 }),
          updateMany: vi.fn().mockResolvedValue({ count: 1 })
        }
      }
      memberRepo = {
        findByUserId: vi.fn(),
        findByUserAndGuild: vi.fn(),
        findByUserIdWithGuildAndMembers: vi.fn(),
        create: vi.fn(),
        updateRole: vi.fn(),
        delete: vi.fn(),
        countByGuild: vi.fn()
      }
      guildRepo = {
        findById: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        findActiveCampaignByGuild: vi.fn().mockResolvedValue(null),
        findCurrentCampaignByGuildWithEntries: vi.fn(),
        findCampaignById: vi.fn(),
        listCampaignsByGuild: vi.fn(),
        createCampaign: vi.fn()
      }
      const messageRepo: any = { findByGuild: vi.fn(), findById: vi.fn(), create: vi.fn(), softDelete: vi.fn() }
      const inviteRepo: any = {
        findByToken: vi.fn(),
        findById: vi.fn(),
        findByGuild: vi.fn(),
        countActiveByGuild: vi.fn(),
        create: vi.fn(),
        revoke: vi.fn()
      }
      const userRepo: any = { findById: vi.fn() }
      const characterRepo = { findByUserId: vi.fn() }
      service = new GuildService(prisma, guildRepo, memberRepo, messageRepo, inviteRepo, userRepo, characterRepo as any)
    })

    it('bumps contribution even when no campaign is active', async () => {
      memberRepo.findByUserId.mockResolvedValue({ guildId: 'g-1' })
      guildRepo.findActiveCampaignByGuild.mockResolvedValue(null)
      await service.recordCampaignEvent('u1', CAMPAIGN_EVENT_TYPE.ENEMY_KILL, 1)
      expect(prisma.guild.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'g-1' },
          data: { totalContribution: { increment: 5 } }
        })
      )
    })

    it('bumps contribution when event type does not match active campaign', async () => {
      memberRepo.findByUserId.mockResolvedValue({ guildId: 'g-1' })
      guildRepo.findActiveCampaignByGuild.mockResolvedValue({
        id: 'c-1',
        eventType: CAMPAIGN_EVENT_TYPE.TASK_COMPLETION,
        expiresAt: new Date(Date.now() + 60_000),
        target: 100
      })
      await service.recordCampaignEvent('u1', CAMPAIGN_EVENT_TYPE.ENEMY_KILL, 1)
      expect(prisma.guild.update).toHaveBeenCalled()
      expect(prisma.$transaction).not.toHaveBeenCalled()
    })

    it('advances tier when post-bump total crosses a threshold', async () => {
      memberRepo.findByUserId.mockResolvedValue({ guildId: 'g-1' })
      // First call to prisma.guild.update returns post-bump total of 1000 (T2)
      prisma.guild.update.mockResolvedValue({ tier: 1, totalContribution: 1000 })
      guildRepo.findActiveCampaignByGuild.mockResolvedValue(null)
      await service.recordCampaignEvent('u1', CAMPAIGN_EVENT_TYPE.GOLD_EARNED, 5000)
      expect(prisma.guild.updateMany).toHaveBeenCalledWith({
        where: { id: 'g-1', tier: { lt: 2 } },
        data: { tier: 2 }
      })
    })

    it('does not advance tier if no threshold crossed', async () => {
      memberRepo.findByUserId.mockResolvedValue({ guildId: 'g-1' })
      prisma.guild.update.mockResolvedValue({ tier: 1, totalContribution: 100 })
      guildRepo.findActiveCampaignByGuild.mockResolvedValue(null)
      await service.recordCampaignEvent('u1', CAMPAIGN_EVENT_TYPE.ENEMY_KILL, 1)
      expect(prisma.guild.updateMany).not.toHaveBeenCalled()
    })

    it('does not bump when user has no guild', async () => {
      memberRepo.findByUserId.mockResolvedValue(null)
      await service.recordCampaignEvent('u1', CAMPAIGN_EVENT_TYPE.ENEMY_KILL, 1)
      expect(prisma.guild.update).not.toHaveBeenCalled()
    })

    it('swallows errors from the contribution path AND still runs campaign tracking', async () => {
      memberRepo.findByUserId.mockResolvedValue({ guildId: 'g-1' })
      prisma.guild.update.mockRejectedValue(new Error('db down'))
      guildRepo.findActiveCampaignByGuild.mockResolvedValue(null)
      await expect(
        service.recordCampaignEvent('u1', CAMPAIGN_EVENT_TYPE.ENEMY_KILL, 1)
      ).resolves.toBeUndefined()
      // Documented independence: campaign lookup must still run after the contribution
      // path throws — otherwise a single bad guild row would also break campaign progress.
      expect(guildRepo.findActiveCampaignByGuild).toHaveBeenCalledWith('g-1')
    })
  })

  describe('GuildService.applyCombatRewards / getMyProgression', () => {
    let service: GuildService
    let prisma: any
    let memberRepo: any
    let guildRepo: any

    beforeEach(() => {
      vi.clearAllMocks()
      prisma = {
        $transaction: vi.fn(),
        guild: {
          update: vi.fn().mockResolvedValue({ tier: 1, totalContribution: 5 }),
          updateMany: vi.fn().mockResolvedValue({ count: 1 })
        }
      }
      memberRepo = {
        findByUserId: vi.fn(),
        findByUserAndGuild: vi.fn(),
        findByUserIdWithGuildAndMembers: vi.fn(),
        create: vi.fn(),
        updateRole: vi.fn(),
        delete: vi.fn(),
        countByGuild: vi.fn()
      }
      guildRepo = {
        findById: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        findActiveCampaignByGuild: vi.fn().mockResolvedValue(null),
        findCurrentCampaignByGuildWithEntries: vi.fn(),
        findCampaignById: vi.fn(),
        listCampaignsByGuild: vi.fn(),
        createCampaign: vi.fn()
      }
      const messageRepo: any = { findByGuild: vi.fn(), findById: vi.fn(), create: vi.fn(), softDelete: vi.fn() }
      const inviteRepo: any = {
        findByToken: vi.fn(),
        findById: vi.fn(),
        findByGuild: vi.fn(),
        countActiveByGuild: vi.fn(),
        create: vi.fn(),
        revoke: vi.fn()
      }
      const userRepo: any = { findById: vi.fn() }
      const characterRepo = { findByUserId: vi.fn() }
      service = new GuildService(
        prisma as any,
        guildRepo,
        memberRepo,
        messageRepo,
        inviteRepo,
        userRepo,
        characterRepo as any
      )
    })

    it('applyCombatRewards returns baseGold and skips recording when guildless', async () => {
      memberRepo.findByUserId.mockResolvedValue(null)
      const gold = await service.applyCombatRewards('u1', 10)
      expect(gold).toBe(10)
      expect(prisma.guild.update).not.toHaveBeenCalled()
      expect(guildRepo.findActiveCampaignByGuild).not.toHaveBeenCalled()
    })

    it('applyCombatRewards floors gold by tier multiplier and records both events with one lookup', async () => {
      memberRepo.findByUserId.mockResolvedValue({ guildId: 'g-1' })
      guildRepo.findById.mockResolvedValue({ id: 'g-1', tier: 3, totalContribution: 6000 })
      // Tier 3 = 1.10x multiplier. 10 * 1.10 = 11.
      const gold = await service.applyCombatRewards('u1', 10)
      expect(gold).toBe(11)
      // Single member + guild lookup pair, even though two events fire downstream.
      expect(memberRepo.findByUserId).toHaveBeenCalledTimes(1)
      expect(guildRepo.findById).toHaveBeenCalledTimes(1)
      // Both ENEMY_KILL and GOLD_EARNED ran through the contribution + campaign paths.
      expect(prisma.guild.update).toHaveBeenCalledTimes(2)
      expect(guildRepo.findActiveCampaignByGuild).toHaveBeenCalledTimes(2)
    })

    it('applyCombatRewards: GOLD_EARNED contribution uses multiplied gold, campaign progress uses baseGold', async () => {
      memberRepo.findByUserId.mockResolvedValue({ guildId: 'g-1' })
      guildRepo.findById.mockResolvedValue({ id: 'g-1', tier: 5, totalContribution: 50000 })

      // Active GOLD_EARNED campaign so the campaign branch actually runs.
      guildRepo.findActiveCampaignByGuild.mockResolvedValue({
        id: 'c-1',
        eventType: CAMPAIGN_EVENT_TYPE.GOLD_EARNED,
        expiresAt: new Date(Date.now() + 60_000),
        target: 1000
      })

      const campaignProgressIncrements: number[] = []
      const tx = {
        guildCampaign: {
          findUnique: vi.fn().mockResolvedValue({
            completedAt: null,
            expiresAt: new Date(Date.now() + 60_000),
            progress: 0,
            target: 1000,
            rewardPool: { gold: 0 }
          }),
          update: vi.fn().mockImplementation(async ({ data }: any) => {
            campaignProgressIncrements.push(data.progress.increment)
            return { id: 'c-1', progress: 0, completedAt: null }
          }),
          updateMany: vi.fn()
        },
        guildCampaignProgress: {
          upsert: vi.fn().mockResolvedValue(undefined),
          findMany: vi.fn().mockResolvedValue([]),
          updateMany: vi.fn()
        }
      }
      prisma.$transaction.mockImplementation(async (fn: any) => fn(tx))

      // baseGold=10, tier=5 → multipliedGold=12 (floor(10 * 1.20)).
      // Contribution points for GOLD_EARNED: floor(12 / 5) * 1 = 2.
      await service.applyCombatRewards('u1', 10)

      // Contribution side carries the post-multiplier weight (bounded feedback loop, allowed).
      const goldEarnedContribCall = prisma.guild.update.mock.calls.find(
        (call: any) => call[0]?.data?.totalContribution?.increment === 2
      )
      expect(goldEarnedContribCall).toBeDefined()

      // Campaign side must use baseGold so Phase 2 target progress is not skewed by tier.
      expect(campaignProgressIncrements).toContain(10)
      expect(campaignProgressIncrements).not.toContain(12)
    })

    it('applyCombatRewards skips GOLD_EARNED recording when post-multiplier gold is 0', async () => {
      memberRepo.findByUserId.mockResolvedValue({ guildId: 'g-1' })
      guildRepo.findById.mockResolvedValue({ id: 'g-1', tier: 1, totalContribution: 0 })
      const gold = await service.applyCombatRewards('u1', 0)
      expect(gold).toBe(0)
      // Only ENEMY_KILL recorded.
      expect(prisma.guild.update).toHaveBeenCalledTimes(1)
      expect(guildRepo.findActiveCampaignByGuild).toHaveBeenCalledTimes(1)
    })

    it('applyCombatRewards falls back to baseGold when membership lookup throws', async () => {
      memberRepo.findByUserId.mockRejectedValue(new Error('db down'))
      const gold = await service.applyCombatRewards('u1', 10)
      expect(gold).toBe(10)
      expect(prisma.guild.update).not.toHaveBeenCalled()
    })

    it('applyCombatRewards falls back to baseGold when member references a missing guild', async () => {
      memberRepo.findByUserId.mockResolvedValue({ guildId: 'g-1' })
      guildRepo.findById.mockResolvedValue(null)
      const gold = await service.applyCombatRewards('u1', 10)
      expect(gold).toBe(10)
      expect(prisma.guild.update).not.toHaveBeenCalled()
    })

    it('getMyProgression returns null when guildless', async () => {
      memberRepo.findByUserId.mockResolvedValue(null)
      const x = await service.getMyProgression('u1')
      expect(x).toBeNull()
    })

    it('getMyProgression returns tier + nextThreshold + multiplier', async () => {
      memberRepo.findByUserId.mockResolvedValue({ guildId: 'g-1' })
      guildRepo.findById.mockResolvedValue({ id: 'g-1', tier: 2, totalContribution: 2500 })
      const x = await service.getMyProgression('u1')
      expect(x).toEqual(
        expect.objectContaining({
          guildId: 'g-1',
          tier: 2,
          maxTier: 5,
          totalContribution: 2500,
          nextThreshold: 5000,
          goldMultiplier: 1.05
        })
      )
    })

    it('getMyProgression nextThreshold is null at max tier', async () => {
      memberRepo.findByUserId.mockResolvedValue({ guildId: 'g-1' })
      guildRepo.findById.mockResolvedValue({ id: 'g-1', tier: 5, totalContribution: 50000 })
      const x = await service.getMyProgression('u1')
      expect(x?.nextThreshold).toBeNull()
    })
  })
})
