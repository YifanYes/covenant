import { CAMPAIGN_EVENT_TYPE } from '@shared/constants/guild-campaigns'
import { GuildRole } from '@shared/schemas/guilds.schemas'
import { TRPCError } from '@trpc/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GuildService } from '../../services/guild.service'

interface TxMocks {
  guildCampaign: {
    findUnique: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    updateMany: ReturnType<typeof vi.fn>
  }
  guildCampaignProgress: {
    upsert: ReturnType<typeof vi.fn>
    count: ReturnType<typeof vi.fn>
    findUnique: ReturnType<typeof vi.fn>
    findMany: ReturnType<typeof vi.fn>
    updateMany: ReturnType<typeof vi.fn>
  }
  character: {
    update: ReturnType<typeof vi.fn>
  }
}

describe('GuildService — campaigns', () => {
  let service: GuildService
  let prisma: any
  let tx: TxMocks
  let guildRepo: any
  let memberRepo: any
  let messageRepo: any
  let inviteRepo: any
  let userRepo: any
  let characterRepo: any

  beforeEach(() => {
    vi.clearAllMocks()

    tx = {
      guildCampaign: {
        findUnique: vi.fn(),
        update: vi.fn().mockResolvedValue({ id: 'c-1', progress: 1, completedAt: null }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 })
      },
      guildCampaignProgress: {
        upsert: vi.fn().mockResolvedValue({ id: 'p-1', contribution: 1 }),
        count: vi.fn().mockResolvedValue(1),
        findUnique: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        updateMany: vi.fn().mockResolvedValue({ count: 1 })
      },
      character: {
        update: vi.fn().mockResolvedValue({ id: 'char-1' })
      }
    }

    prisma = {
      $transaction: vi.fn(async (fn: any) => fn(tx))
    }

    guildRepo = {
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findActiveCampaignByGuild: vi.fn(),
      findCurrentCampaignByGuildWithEntries: vi.fn(),
      findCampaignById: vi.fn(),
      listCampaignsByGuild: vi.fn(),
      createCampaign: vi.fn()
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

    messageRepo = { findByGuild: vi.fn(), findById: vi.fn(), create: vi.fn(), softDelete: vi.fn() }
    inviteRepo = {
      findByToken: vi.fn(),
      findById: vi.fn(),
      findByGuild: vi.fn(),
      countActiveByGuild: vi.fn(),
      create: vi.fn(),
      revoke: vi.fn()
    }
    userRepo = { findById: vi.fn() }

    characterRepo = {
      findByUserId: vi.fn()
    }

    service = new GuildService(prisma, guildRepo, memberRepo, messageRepo, inviteRepo, userRepo, characterRepo)
  })

  describe('startCampaign', () => {
    it('rejects non-officer/owner', async () => {
      memberRepo.findByUserAndGuild.mockResolvedValue({ role: GuildRole.MEMBER })
      await expect(
        service.startCampaign({ guildId: 'g-1', templateId: 'KILL_RAMPAGE' }, 'u1')
      ).rejects.toBeInstanceOf(TRPCError)
    })

    it('rejects unknown template id', async () => {
      memberRepo.findByUserAndGuild.mockResolvedValue({ role: GuildRole.OWNER })
      await expect(
        service.startCampaign({ guildId: 'g-1', templateId: 'NOPE' }, 'u1')
      ).rejects.toThrow('Unknown campaign template')
    })

    it('rejects when active campaign exists', async () => {
      memberRepo.findByUserAndGuild.mockResolvedValue({ role: GuildRole.OWNER })
      guildRepo.findActiveCampaignByGuild.mockResolvedValue({ id: 'c-existing' })
      await expect(
        service.startCampaign({ guildId: 'g-1', templateId: 'KILL_RAMPAGE' }, 'u1')
      ).rejects.toThrow('already active')
    })

    it('creates a campaign when officer + no active', async () => {
      memberRepo.findByUserAndGuild.mockResolvedValue({ role: GuildRole.OFFICER })
      guildRepo.findActiveCampaignByGuild.mockResolvedValue(null)
      guildRepo.createCampaign.mockResolvedValue({
        id: 'c-1',
        guildId: 'g-1',
        templateId: 'KILL_RAMPAGE',
        eventType: 'ENEMY_KILL',
        target: 100,
        progress: 0,
        startedAt: new Date(),
        expiresAt: new Date(),
        completedAt: null
      })
      const result = await service.startCampaign({ guildId: 'g-1', templateId: 'KILL_RAMPAGE' }, 'u1')
      expect(result.id).toBe('c-1')
      expect(guildRepo.createCampaign).toHaveBeenCalledWith(
        expect.objectContaining({
          guildId: 'g-1',
          templateId: 'KILL_RAMPAGE',
          eventType: 'ENEMY_KILL',
          startedBy: 'u1'
        })
      )
    })
  })

  describe('recordEvent', () => {
    it('no-ops when user is not in a guild', async () => {
      memberRepo.findByUserId.mockResolvedValue(null)
      await service.recordCampaignEvent('u1', CAMPAIGN_EVENT_TYPE.ENEMY_KILL, 1)
      expect(prisma.$transaction).not.toHaveBeenCalled()
    })

    it('no-ops when no active campaign', async () => {
      memberRepo.findByUserId.mockResolvedValue({ guildId: 'g-1' })
      guildRepo.findActiveCampaignByGuild.mockResolvedValue(null)
      await service.recordCampaignEvent('u1', CAMPAIGN_EVENT_TYPE.ENEMY_KILL, 1)
      expect(prisma.$transaction).not.toHaveBeenCalled()
    })

    it('no-ops when event type does not match', async () => {
      memberRepo.findByUserId.mockResolvedValue({ guildId: 'g-1' })
      guildRepo.findActiveCampaignByGuild.mockResolvedValue({
        id: 'c-1',
        eventType: CAMPAIGN_EVENT_TYPE.TASK_COMPLETION,
        expiresAt: new Date(Date.now() + 60_000)
      })
      await service.recordCampaignEvent('u1', CAMPAIGN_EVENT_TYPE.ENEMY_KILL, 1)
      expect(prisma.$transaction).not.toHaveBeenCalled()
    })

    it('no-ops when campaign has expired', async () => {
      memberRepo.findByUserId.mockResolvedValue({ guildId: 'g-1' })
      guildRepo.findActiveCampaignByGuild.mockResolvedValue({
        id: 'c-1',
        eventType: CAMPAIGN_EVENT_TYPE.ENEMY_KILL,
        expiresAt: new Date(Date.now() - 60_000)
      })
      await service.recordCampaignEvent('u1', CAMPAIGN_EVENT_TYPE.ENEMY_KILL, 1)
      expect(prisma.$transaction).not.toHaveBeenCalled()
    })

    it('upserts progress and increments campaign on valid event', async () => {
      memberRepo.findByUserId.mockResolvedValue({ guildId: 'g-1' })
      guildRepo.findActiveCampaignByGuild.mockResolvedValue({
        id: 'c-1',
        eventType: CAMPAIGN_EVENT_TYPE.ENEMY_KILL,
        expiresAt: new Date(Date.now() + 60_000),
        target: 100
      })
      tx.guildCampaign.findUnique.mockResolvedValue({
        completedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
        progress: 50,
        target: 100
      })
      tx.guildCampaign.update.mockResolvedValue({ id: 'c-1', progress: 51, completedAt: null })
      await service.recordCampaignEvent('u1', CAMPAIGN_EVENT_TYPE.ENEMY_KILL, 1)
      expect(tx.guildCampaignProgress.upsert).toHaveBeenCalled()
      expect(tx.guildCampaign.update).toHaveBeenCalled()
    })

    it('snapshots goldClaimed per contributor when target reached', async () => {
      memberRepo.findByUserId.mockResolvedValue({ guildId: 'g-1' })
      guildRepo.findActiveCampaignByGuild.mockResolvedValue({
        id: 'c-1',
        eventType: CAMPAIGN_EVENT_TYPE.ENEMY_KILL,
        expiresAt: new Date(Date.now() + 60_000),
        target: 100
      })
      tx.guildCampaign.findUnique.mockResolvedValue({
        completedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
        progress: 99,
        target: 100,
        rewardPool: { gold: 600 }
      })
      tx.guildCampaign.update.mockResolvedValue({ id: 'c-1', progress: 100, completedAt: null })
      // Race-safe completion: first updateMany sets completedAt with count=1 (this tx wins)
      tx.guildCampaign.updateMany.mockResolvedValueOnce({ count: 1 })
      tx.guildCampaignProgress.findMany.mockResolvedValue([
        { id: 'p-1' },
        { id: 'p-2' },
        { id: 'p-3' }
      ])
      await service.recordCampaignEvent('u1', CAMPAIGN_EVENT_TYPE.ENEMY_KILL, 1)
      // Stamp goldClaimed = floor(600 / 3) = 200 on contributor entries
      expect(tx.guildCampaignProgress.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { campaignId: 'c-1', contribution: { gt: 0 } },
          data: { goldClaimed: 200 }
        })
      )
      expect(tx.guildCampaign.update).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: { id: 'c-1' },
          data: { contributorCount: 3 }
        })
      )
    })

    it('skips snapshot when another tx already completed the campaign', async () => {
      memberRepo.findByUserId.mockResolvedValue({ guildId: 'g-1' })
      guildRepo.findActiveCampaignByGuild.mockResolvedValue({
        id: 'c-1',
        eventType: CAMPAIGN_EVENT_TYPE.ENEMY_KILL,
        expiresAt: new Date(Date.now() + 60_000),
        target: 100
      })
      tx.guildCampaign.findUnique.mockResolvedValue({
        completedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
        progress: 99,
        target: 100,
        rewardPool: { gold: 600 }
      })
      tx.guildCampaign.update.mockResolvedValue({ id: 'c-1', progress: 100, completedAt: null })
      // First updateMany loses the race: count=0
      tx.guildCampaign.updateMany.mockResolvedValueOnce({ count: 0 })
      await service.recordCampaignEvent('u1', CAMPAIGN_EVENT_TYPE.ENEMY_KILL, 1)
      // Did not stamp goldClaimed
      expect(tx.guildCampaignProgress.updateMany).not.toHaveBeenCalled()
    })

    it('swallows errors silently', async () => {
      memberRepo.findByUserId.mockRejectedValue(new Error('boom'))
      await expect(
        service.recordCampaignEvent('u1', CAMPAIGN_EVENT_TYPE.ENEMY_KILL, 1)
      ).resolves.toBeUndefined()
    })

    it('ignores amount <= 0', async () => {
      await service.recordCampaignEvent('u1', CAMPAIGN_EVENT_TYPE.ENEMY_KILL, 0)
      expect(memberRepo.findByUserId).not.toHaveBeenCalled()
    })
  })

  describe('claimReward', () => {
    const baseCampaign = {
      id: 'c-1',
      guildId: 'g-1',
      completedAt: new Date(),
      contributorCount: 4,
      rewardPool: { gold: 400 }
    }

    it('rejects non-member', async () => {
      guildRepo.findCampaignById.mockResolvedValue(baseCampaign)
      memberRepo.findByUserAndGuild.mockResolvedValue(null)
      await expect(service.claimCampaignReward('c-1', 'u1')).rejects.toBeInstanceOf(TRPCError)
    })

    it('rejects when campaign not completed', async () => {
      guildRepo.findCampaignById.mockResolvedValue({ ...baseCampaign, completedAt: null })
      memberRepo.findByUserAndGuild.mockResolvedValue({ role: GuildRole.MEMBER, guildId: 'g-1' })
      await expect(service.claimCampaignReward('c-1', 'u1')).rejects.toThrow('not been completed')
    })

    it('rejects non-contributor (no progress entry)', async () => {
      guildRepo.findCampaignById.mockResolvedValue(baseCampaign)
      memberRepo.findByUserAndGuild.mockResolvedValue({ role: GuildRole.MEMBER, guildId: 'g-1' })
      characterRepo.findByUserId.mockResolvedValue({ id: 'char-1' })
      tx.guildCampaignProgress.updateMany.mockResolvedValueOnce({ count: 0 })
      tx.guildCampaignProgress.findUnique.mockResolvedValue(null)
      await expect(service.claimCampaignReward('c-1', 'u1')).rejects.toThrow('did not contribute')
    })

    it('rejects late contributor (goldClaimed snapshot = 0) with late-contribution message', async () => {
      guildRepo.findCampaignById.mockResolvedValue(baseCampaign)
      memberRepo.findByUserAndGuild.mockResolvedValue({ role: GuildRole.MEMBER, guildId: 'g-1' })
      characterRepo.findByUserId.mockResolvedValue({ id: 'char-1' })
      tx.guildCampaignProgress.updateMany.mockResolvedValueOnce({ count: 0 })
      tx.guildCampaignProgress.findUnique.mockResolvedValue({
        contribution: 5,
        goldClaimed: 0,
        claimedAt: null
      })
      await expect(service.claimCampaignReward('c-1', 'u1')).rejects.toThrow('after the target was reached')
    })

    it('rejects double-claim', async () => {
      guildRepo.findCampaignById.mockResolvedValue(baseCampaign)
      memberRepo.findByUserAndGuild.mockResolvedValue({ role: GuildRole.MEMBER, guildId: 'g-1' })
      characterRepo.findByUserId.mockResolvedValue({ id: 'char-1' })
      tx.guildCampaignProgress.updateMany.mockResolvedValueOnce({ count: 0 })
      tx.guildCampaignProgress.findUnique.mockResolvedValue({
        contribution: 10,
        goldClaimed: 100,
        claimedAt: new Date()
      })
      await expect(service.claimCampaignReward('c-1', 'u1')).rejects.toThrow('already claimed')
    })

    it('awards snapshotted goldClaimed to contributor', async () => {
      guildRepo.findCampaignById.mockResolvedValue(baseCampaign)
      memberRepo.findByUserAndGuild.mockResolvedValue({ role: GuildRole.MEMBER, guildId: 'g-1' })
      characterRepo.findByUserId.mockResolvedValue({ id: 'char-1' })
      tx.guildCampaignProgress.updateMany.mockResolvedValueOnce({ count: 1 })
      tx.guildCampaignProgress.findUnique.mockResolvedValue({
        contribution: 10,
        goldClaimed: 100,
        claimedAt: null
      })
      const result = await service.claimCampaignReward('c-1', 'u1')
      expect(result.goldClaimed).toBe(100)
      expect(tx.character.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'char-1' },
          data: { gold: { increment: 100 } }
        })
      )
    })
  })
})
