/* eslint-disable @typescript-eslint/no-explicit-any -- TODO: replace tx-model `any` with PrismaClient delegate types */
import { GuildRole } from '@shared/schemas/guilds.schemas'
import { TRPCError } from '@trpc/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CharacterRepository } from '../../repositories/character.repository'
import type { GuildInviteRepository } from '../../repositories/guild-invite.repository'
import type { GuildMemberRepository } from '../../repositories/guild-member.repository'
import type { GuildMessageRepository } from '../../repositories/guild-message.repository'
import type { GuildRepository } from '../../repositories/guild.repository'
import type { UserRepository } from '../../repositories/user.repository'
import { GuildService, INVITE_INVALID_REASON } from '../../services/guild.service'
import { createPrismaMock, createRepoMock } from '../helpers/mock-repo'

describe('GuildService', () => {
  let service: GuildService
  let prisma: ReturnType<typeof createPrismaMock>
  let txGuildInvite: ReturnType<typeof createRepoMock<any>>
  let txGuildMember: ReturnType<typeof createRepoMock<any>>
  let txGuild: ReturnType<typeof createRepoMock<any>>
  let txCharacter: ReturnType<typeof createRepoMock<any>>
  let guildRepo: ReturnType<typeof createRepoMock<GuildRepository>>
  let memberRepo: ReturnType<typeof createRepoMock<GuildMemberRepository>>
  let messageRepo: ReturnType<typeof createRepoMock<GuildMessageRepository>>
  let inviteRepo: ReturnType<typeof createRepoMock<GuildInviteRepository>>
  let userRepo: ReturnType<typeof createRepoMock<UserRepository>>
  let characterRepo: ReturnType<typeof createRepoMock<CharacterRepository>>

  beforeEach(() => {
    vi.clearAllMocks()

    txGuild = createRepoMock<any>()
    txGuildMember = createRepoMock<any>()
    txGuildInvite = createRepoMock<any>()
    txCharacter = createRepoMock<any>()
    txGuild.create.mockResolvedValue({ id: BigInt(1), slug: 'g-slug', name: 'New', ownerId: 'u1' })
    txGuildMember.create.mockResolvedValue({ id: BigInt(16) })
    txGuildMember.count.mockResolvedValue(1)
    txGuildMember.findMany.mockResolvedValue([])
    txGuildInvite.updateMany.mockResolvedValue({ count: 1 })
    txCharacter.updateMany.mockResolvedValue({ count: 0 })

    prisma = createPrismaMock({
      guild: txGuild,
      guildMember: txGuildMember,
      guildInvite: txGuildInvite,
      character: txCharacter
    })
    // Slug uniqueness probe inside createGuild runs outside the transaction.
    ;(prisma as unknown as { guild: { findUnique: ReturnType<typeof vi.fn> } }).guild = {
      findUnique: vi.fn().mockResolvedValue(null)
    }

    guildRepo = createRepoMock<GuildRepository>()
    guildRepo.findBySlug.mockResolvedValue({ id: BigInt(1), slug: 'g-slug' })
    memberRepo = createRepoMock<GuildMemberRepository>()
    memberRepo.findByPublicId.mockResolvedValue({ id: BigInt(10), publicId: 'mem-pub' })
    messageRepo = createRepoMock<GuildMessageRepository>()
    inviteRepo = createRepoMock<GuildInviteRepository>()
    userRepo = createRepoMock<UserRepository>()
    inviteRepo.countActiveByGuild.mockResolvedValue(0)
    inviteRepo.create.mockResolvedValue({ id: BigInt(21) } as never)
    userRepo.findById.mockResolvedValue({ id: 'u1', theme: 'HOLY_KNIGHTS' } as never)

    characterRepo = createRepoMock<CharacterRepository>()

    service = new GuildService(prisma, guildRepo, memberRepo, messageRepo, inviteRepo, userRepo, characterRepo)
  })

  describe('createGuild', () => {
    it('rejects when user is already in a guild', async () => {
      memberRepo.findByUserId.mockResolvedValue({ id: BigInt(10), guildId: BigInt(1), userId: 'u1', role: 'MEMBER' })

      await expect(service.createGuild({ name: 'Test', description: '' }, 'u1')).rejects.toThrow(
        'You already belong to a guild'
      )
    })

    it('creates guild + owner member when user is unaffiliated', async () => {
      memberRepo.findByUserId.mockResolvedValue(null)
      const result = await service.createGuild({ name: 'New' }, 'u1')
      expect(prisma.$transaction).toHaveBeenCalled()
      expect(result.id).toBe(BigInt(1))
    })

    it('translates Prisma unique violation to friendly error', async () => {
      memberRepo.findByUserId.mockResolvedValue(null)
      prisma.$transaction.mockRejectedValueOnce(Object.assign(new Error('unique'), { code: 'P2002' }))
      await expect(service.createGuild({ name: 'New' }, 'u1')).rejects.toThrow('You already belong to a guild')
    })
  })

  describe('updateGuild', () => {
    it('rejects non-owner', async () => {
      memberRepo.findByUserAndGuild.mockResolvedValue({ id: BigInt(10), role: GuildRole.CAPTAIN, guildId: BigInt(1) })
      await expect(service.updateGuild({ guildSlug: 'g-slug', name: 'X' }, 'u1')).rejects.toBeInstanceOf(TRPCError)
    })

    it('updates when owner', async () => {
      memberRepo.findByUserAndGuild.mockResolvedValue({ id: BigInt(10), role: GuildRole.GUILD_MASTER, guildId: BigInt(1) })
      guildRepo.update.mockResolvedValue({ id: BigInt(1), name: 'X' })
      await service.updateGuild({ guildSlug: 'g-slug', name: 'X' }, 'u1')
      expect(guildRepo.update).toHaveBeenCalledWith(BigInt(1), { name: 'X', description: undefined })
    })
  })

  describe('dissolveGuild', () => {
    it('rejects non-owner', async () => {
      memberRepo.findByUserAndGuild.mockResolvedValue({ id: BigInt(10), role: GuildRole.MEMBER, guildId: BigInt(1) })
      await expect(service.dissolveGuild('g-slug', 'u1')).rejects.toBeInstanceOf(TRPCError)
    })

    it('deletes guild when owner', async () => {
      memberRepo.findByUserAndGuild.mockResolvedValue({ id: BigInt(10), role: GuildRole.GUILD_MASTER, guildId: BigInt(1) })
      memberRepo.findUserIdsByGuild.mockResolvedValue(['u1', 'u2'])
      await service.dissolveGuild('g-slug', 'u1')
      expect(txGuild.delete).toHaveBeenCalledWith({ where: { id: BigInt(1) } })
      expect(txCharacter.updateMany).toHaveBeenCalledWith({
        where: { userId: { in: ['u1', 'u2'] } },
        data: { title: null }
      })
    })
  })

  describe('joinByToken', () => {
    const validInvite = {
      id: BigInt(20),
      guildId: BigInt(1),
      token: 'tok',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      maxUses: 5,
      usedCount: 0
    }

    it('rejects when user already in a guild', async () => {
      memberRepo.findByUserId.mockResolvedValue({ id: BigInt(10) })
      await expect(service.joinByToken('tok', 'u1')).rejects.toThrow('You already belong to a guild')
    })

    it('rejects expired invite (pre-tx)', async () => {
      memberRepo.findByUserId.mockResolvedValue(null)
      inviteRepo.findByToken.mockResolvedValue({ ...validInvite, expiresAt: new Date(Date.now() - 1000) })
      await expect(service.joinByToken('tok', 'u1')).rejects.toThrow('expired')
    })

    it('rejects revoked invite (pre-tx)', async () => {
      memberRepo.findByUserId.mockResolvedValue(null)
      inviteRepo.findByToken.mockResolvedValue({ ...validInvite, revokedAt: new Date() })
      await expect(service.joinByToken('tok', 'u1')).rejects.toThrow('revoked')
    })

    it('rejects when maxUses reached pre-tx', async () => {
      memberRepo.findByUserId.mockResolvedValue(null)
      inviteRepo.findByToken.mockResolvedValue({ ...validInvite, maxUses: 1, usedCount: 1 })
      await expect(service.joinByToken('tok', 'u1')).rejects.toThrow('use limit')
    })

    it('rejects when atomic claim returns count 0 (race)', async () => {
      memberRepo.findByUserId.mockResolvedValue(null)
      inviteRepo.findByToken.mockResolvedValue(validInvite)
      guildRepo.findById.mockResolvedValue({ id: BigInt(1), slug: 'g-slug', capacity: 50 })
      txGuildInvite.updateMany.mockResolvedValueOnce({ count: 0 })
      await expect(service.joinByToken('tok', 'u1')).rejects.toThrow('Invite no longer valid')
    })

    it('rejects when capacity reached inside tx', async () => {
      memberRepo.findByUserId.mockResolvedValue(null)
      inviteRepo.findByToken.mockResolvedValue(validInvite)
      guildRepo.findById.mockResolvedValue({ id: BigInt(1), slug: 'g-slug', capacity: 50 })
      txGuildInvite.updateMany.mockResolvedValueOnce({ count: 1 })
      txGuildMember.count.mockResolvedValueOnce(50)
      await expect(service.joinByToken('tok', 'u1')).rejects.toThrow('capacity')
    })

    it('joins atomically when invite valid + capacity available', async () => {
      memberRepo.findByUserId.mockResolvedValue(null)
      inviteRepo.findByToken.mockResolvedValue(validInvite)
      guildRepo.findById.mockResolvedValue({ id: BigInt(1), slug: 'g-slug', capacity: 50 })
      txGuildInvite.updateMany.mockResolvedValueOnce({ count: 1 })
      txGuildMember.count.mockResolvedValueOnce(5)
      const result = await service.joinByToken('tok', 'u1')
      expect(result.guildSlug).toBe('g-slug')
      expect(txGuildInvite.updateMany).toHaveBeenCalled()
      expect(txGuildMember.create).toHaveBeenCalled()
    })

    it('translates P2002 inside tx to friendly error', async () => {
      memberRepo.findByUserId.mockResolvedValue(null)
      inviteRepo.findByToken.mockResolvedValue(validInvite)
      guildRepo.findById.mockResolvedValue({ id: BigInt(1), slug: 'g-slug', capacity: 50 })
      prisma.$transaction.mockRejectedValueOnce(Object.assign(new Error('dup'), { code: 'P2002' }))
      await expect(service.joinByToken('tok', 'u1')).rejects.toThrow('You already belong to a guild')
    })
  })

  describe('leaveGuild', () => {
    it('throws if user has no membership', async () => {
      memberRepo.findByUserId.mockResolvedValue(null)
      await expect(service.leaveGuild('u1')).rejects.toBeInstanceOf(TRPCError)
    })

    it('blocks owner with other members from leaving', async () => {
      memberRepo.findByUserId.mockResolvedValue({ id: BigInt(10), guildId: BigInt(1), userId: 'u1', role: GuildRole.GUILD_MASTER })
      memberRepo.countByGuild.mockResolvedValue(3)
      await expect(service.leaveGuild('u1')).rejects.toThrow('Transfer ownership')
    })

    it('dissolves guild when sole owner leaves', async () => {
      memberRepo.findByUserId.mockResolvedValue({ id: BigInt(10), guildId: BigInt(1), userId: 'u1', role: GuildRole.GUILD_MASTER })
      memberRepo.countByGuild.mockResolvedValue(1)
      const result = await service.leaveGuild('u1')
      expect(result.dissolved).toBe(true)
      expect(txGuild.delete).toHaveBeenCalledWith({ where: { id: BigInt(1) } })
      expect(txCharacter.updateMany).toHaveBeenCalledWith({ where: { userId: 'u1' }, data: { title: null } })
    })

    it('removes member when non-owner leaves', async () => {
      memberRepo.findByUserId.mockResolvedValue({ id: BigInt(10), guildId: BigInt(1), userId: 'u1', role: GuildRole.MEMBER })
      memberRepo.countByGuild.mockResolvedValue(3)
      const result = await service.leaveGuild('u1')
      expect(result.dissolved).toBe(false)
      expect(txGuildMember.delete).toHaveBeenCalledWith({ where: { id: BigInt(10) } })
      expect(txCharacter.updateMany).toHaveBeenCalledWith({ where: { userId: 'u1' }, data: { title: null } })
    })
  })

  describe('kickMember permission matrix', () => {
    const guildSlug = 'g-slug'

    function arrange(actorRole: string, targetRole: string) {
      memberRepo.findByUserAndGuild.mockImplementation(async (userId: string, _guildId: bigint) => {
        if (userId === 'actor') return { id: BigInt(11), guildId: BigInt(1), userId, role: actorRole }
        if (userId === 'target') return { id: BigInt(12), guildId: BigInt(1), userId, role: targetRole }
        return null
      })
    }

    it('OWNER can kick OFFICER', async () => {
      arrange(GuildRole.GUILD_MASTER, GuildRole.CAPTAIN)
      await service.kickMember({ guildSlug, targetUserId: 'target' }, 'actor')
      expect(txGuildMember.delete).toHaveBeenCalledWith({ where: { id: BigInt(12) } })
    })

    it('OWNER can kick MEMBER', async () => {
      arrange(GuildRole.GUILD_MASTER, GuildRole.MEMBER)
      await service.kickMember({ guildSlug, targetUserId: 'target' }, 'actor')
      expect(txGuildMember.delete).toHaveBeenCalledWith({ where: { id: BigInt(12) } })
    })

    it('OFFICER cannot kick OFFICER', async () => {
      arrange(GuildRole.CAPTAIN, GuildRole.CAPTAIN)
      await expect(service.kickMember({ guildSlug, targetUserId: 'target' }, 'actor')).rejects.toThrow(
        'Captains cannot kick other captains'
      )
    })

    it('OFFICER can kick MEMBER', async () => {
      arrange(GuildRole.CAPTAIN, GuildRole.MEMBER)
      await service.kickMember({ guildSlug, targetUserId: 'target' }, 'actor')
      expect(txGuildMember.delete).toHaveBeenCalledWith({ where: { id: BigInt(12) } })
    })

    it('MEMBER cannot kick anyone', async () => {
      arrange(GuildRole.MEMBER, GuildRole.MEMBER)
      await expect(service.kickMember({ guildSlug, targetUserId: 'target' }, 'actor')).rejects.toBeInstanceOf(TRPCError)
    })

    it('nobody can kick OWNER', async () => {
      arrange(GuildRole.GUILD_MASTER, GuildRole.GUILD_MASTER)
      await expect(service.kickMember({ guildSlug, targetUserId: 'target' }, 'actor')).rejects.toThrow(
        'Cannot kick the guild master'
      )
    })
  })

  describe('updateRole', () => {
    it('rejects self-role-change', async () => {
      await expect(
        service.updateRole({ guildSlug: 'g-slug', targetUserId: 'u1', role: GuildRole.CAPTAIN }, 'u1')
      ).rejects.toThrow('cannot change your own role')
    })

    it('rejects non-owner caller', async () => {
      memberRepo.findByUserAndGuild.mockImplementation(async (uid: string) => {
        if (uid === 'actor') return { id: BigInt(11), role: GuildRole.CAPTAIN, guildId: BigInt(1) }
        return null
      })
      await expect(
        service.updateRole({ guildSlug: 'g-slug', targetUserId: 'target', role: GuildRole.CAPTAIN }, 'actor')
      ).rejects.toBeInstanceOf(TRPCError)
    })

    it('promotes member to officer', async () => {
      memberRepo.findByUserAndGuild.mockImplementation(async (uid: string) => {
        if (uid === 'owner') return { id: BigInt(13), role: GuildRole.GUILD_MASTER, guildId: BigInt(1) }
        if (uid === 'target') return { id: BigInt(12), role: GuildRole.MEMBER, guildId: BigInt(1) }
        return null
      })
      await service.updateRole({ guildSlug: 'g-slug', targetUserId: 'target', role: GuildRole.CAPTAIN }, 'owner')
      expect(memberRepo.updateRole).toHaveBeenCalledWith(BigInt(12), GuildRole.CAPTAIN)
    })
  })

  describe('deleteMessage', () => {
    const MSG_PUB = 'msgpub000030'

    function arrangeMessage(authorId: string, guildId = BigInt(1)) {
      messageRepo.findByPublicId.mockResolvedValue({
        id: BigInt(30),
        publicId: MSG_PUB,
        guildId,
        userId: authorId,
        deletedAt: null
      })
    }

    function arrangeMember(role: string | null) {
      memberRepo.findByUserAndGuild.mockResolvedValue(role ? { id: BigInt(10), role, guildId: BigInt(1) } : null)
    }

    it('author can delete own message', async () => {
      arrangeMessage('u1')
      arrangeMember(GuildRole.MEMBER)
      await service.deleteMessage(MSG_PUB, 'u1')
      expect(messageRepo.softDelete).toHaveBeenCalledWith(BigInt(30))
    })

    it('OFFICER can delete other member message', async () => {
      arrangeMessage('u2')
      arrangeMember(GuildRole.CAPTAIN)
      await service.deleteMessage(MSG_PUB, 'u1')
      expect(messageRepo.softDelete).toHaveBeenCalledWith(BigInt(30))
    })

    it('OWNER can delete other member message', async () => {
      arrangeMessage('u2')
      arrangeMember(GuildRole.GUILD_MASTER)
      await service.deleteMessage(MSG_PUB, 'u1')
      expect(messageRepo.softDelete).toHaveBeenCalledWith(BigInt(30))
    })

    it('plain MEMBER cannot delete other member message', async () => {
      arrangeMessage('u2')
      arrangeMember(GuildRole.MEMBER)
      await expect(service.deleteMessage(MSG_PUB, 'u1')).rejects.toBeInstanceOf(TRPCError)
    })

    it('non-member cannot delete', async () => {
      arrangeMessage('u1')
      arrangeMember(null)
      await expect(service.deleteMessage(MSG_PUB, 'u1')).rejects.toBeInstanceOf(TRPCError)
    })
  })

  describe('transferOwnership', () => {
    it('demotes prior owner to officer and promotes target to owner', async () => {
      memberRepo.findByUserAndGuild.mockImplementation(async (uid: string) => {
        if (uid === 'owner') return { id: BigInt(13), userId: 'owner', role: GuildRole.GUILD_MASTER, guildId: BigInt(1) }
        if (uid === 'newOwner') return { id: BigInt(14), userId: 'newOwner', role: GuildRole.MEMBER, guildId: BigInt(1) }
        return null
      })

      await service.transferOwnership({ guildSlug: 'g-slug', newOwnerUserId: 'newOwner' }, 'owner')
      expect(prisma.$transaction).toHaveBeenCalled()
    })

    it('rejects transfer to self', async () => {
      await expect(service.transferOwnership({ guildSlug: 'g-slug', newOwnerUserId: 'owner' }, 'owner')).rejects.toThrow(
        'already own'
      )
    })

    it('rejects when target is not in guild', async () => {
      memberRepo.findByUserAndGuild.mockImplementation(async (uid: string) => {
        if (uid === 'owner') return { id: BigInt(13), userId: 'owner', role: GuildRole.GUILD_MASTER, guildId: BigInt(1) }
        return null
      })

      await expect(service.transferOwnership({ guildSlug: 'g-slug', newOwnerUserId: 'ghost' }, 'owner')).rejects.toThrow(
        'not in this guild'
      )
    })
  })

  describe('createInvite', () => {
    beforeEach(() => {
      memberRepo.findByUserAndGuild.mockResolvedValue({ id: BigInt(10), role: GuildRole.CAPTAIN, guildId: BigInt(1) })
    })

    it('rejects when active invite cap reached', async () => {
      inviteRepo.countActiveByGuild.mockResolvedValue(5)
      await expect(service.createInvite({ guildSlug: 'g-slug', expiresInHours: 168 }, 'u1')).rejects.toThrow(
        'Active invite limit reached'
      )
    })

    it('creates invite below cap', async () => {
      inviteRepo.countActiveByGuild.mockResolvedValue(2)
      await service.createInvite({ guildSlug: 'g-slug', expiresInHours: 168 }, 'u1')
      expect(inviteRepo.create).toHaveBeenCalled()
    })
  })

  describe('revokeInvite', () => {
    it('rejects when invite missing', async () => {
      inviteRepo.findById.mockResolvedValue(null)
      await expect(service.revokeInvite('inv-pub', 'u1')).rejects.toBeInstanceOf(TRPCError)
    })

    it('rejects non-officer/owner', async () => {
      inviteRepo.findByPublicId.mockResolvedValue({ id: BigInt(20), publicId: 'inv-pub', guildId: BigInt(1) })
      memberRepo.findByUserAndGuild.mockResolvedValue({ id: BigInt(10), role: GuildRole.MEMBER, guildId: BigInt(1) })
      await expect(service.revokeInvite('inv-pub', 'u1')).rejects.toBeInstanceOf(TRPCError)
    })

    it('revokes when officer', async () => {
      inviteRepo.findByPublicId.mockResolvedValue({ id: BigInt(20), publicId: 'inv-pub', guildId: BigInt(1) })
      memberRepo.findByUserAndGuild.mockResolvedValue({ id: BigInt(10), role: GuildRole.CAPTAIN, guildId: BigInt(1) })
      await service.revokeInvite('inv-pub', 'u1')
      expect(inviteRepo.revoke).toHaveBeenCalledWith(BigInt(20))
    })
  })

  describe('getInvitePreview', () => {
    const baseGuild = {
      id: BigInt(1),
      name: 'G',
      description: null,
      factionName: 'HOLY_KNIGHTS',
      capacity: 50
    }
    const baseInvite = {
      id: BigInt(20),
      guildId: BigInt(1),
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      maxUses: null,
      usedCount: 0
    }

    it('throws when invite missing', async () => {
      inviteRepo.findByToken.mockResolvedValue(null)
      await expect(service.getInvitePreview('tok')).rejects.toBeInstanceOf(TRPCError)
    })

    it('returns valid=true for active invite', async () => {
      inviteRepo.findByToken.mockResolvedValue(baseInvite)
      guildRepo.findById.mockResolvedValue(baseGuild)
      memberRepo.countByGuild.mockResolvedValue(3)
      const out = await service.getInvitePreview('tok')
      expect(out.valid).toBe(true)
      expect(out.reason).toBeNull()
      expect(out.guild.memberCount).toBe(3)
    })

    it('flags expired', async () => {
      inviteRepo.findByToken.mockResolvedValue({ ...baseInvite, expiresAt: new Date(Date.now() - 1000) })
      guildRepo.findById.mockResolvedValue(baseGuild)
      memberRepo.countByGuild.mockResolvedValue(0)
      const out = await service.getInvitePreview('tok')
      expect(out.valid).toBe(false)
      expect(out.reason).toBe(INVITE_INVALID_REASON.EXPIRED)
    })

    it('flags revoked', async () => {
      inviteRepo.findByToken.mockResolvedValue({ ...baseInvite, revokedAt: new Date() })
      guildRepo.findById.mockResolvedValue(baseGuild)
      memberRepo.countByGuild.mockResolvedValue(0)
      const out = await service.getInvitePreview('tok')
      expect(out.reason).toBe(INVITE_INVALID_REASON.REVOKED)
    })

    it('flags exhausted', async () => {
      inviteRepo.findByToken.mockResolvedValue({ ...baseInvite, maxUses: 2, usedCount: 2 })
      guildRepo.findById.mockResolvedValue(baseGuild)
      memberRepo.countByGuild.mockResolvedValue(0)
      const out = await service.getInvitePreview('tok')
      expect(out.reason).toBe(INVITE_INVALID_REASON.EXHAUSTED)
    })
  })

  describe('updateTitlePool', () => {
    const guildId = BigInt(1)

    beforeEach(() => {
      memberRepo.findByUserAndGuild.mockResolvedValue({
        id: BigInt(11),
        userId: 'actor',
        role: GuildRole.GUILD_MASTER,
        guildId
      })
    })

    it('rejects when caller is plain MEMBER', async () => {
      memberRepo.findByUserAndGuild.mockResolvedValue({
        id: BigInt(11),
        userId: 'actor',
        role: GuildRole.MEMBER,
        guildId
      })
      await expect(
        service.updateTitlePool({ guildSlug: 'g-slug', titles: ['Tank'] }, 'actor')
      ).rejects.toBeInstanceOf(TRPCError)
    })

    it('writes new pool and clears titles for members whose title was removed', async () => {
      txGuild.findUnique.mockResolvedValue({ availableTitles: ['Tank', 'Healer', 'Bard'] })
      txGuildMember.findMany.mockResolvedValue([{ userId: 'u1' }, { userId: 'u2' }])

      await service.updateTitlePool({ guildSlug: 'g-slug', titles: ['Tank', 'Healer'] }, 'actor')

      expect(txGuild.update).toHaveBeenCalledWith({
        where: { id: guildId },
        data: { availableTitles: ['Tank', 'Healer'] }
      })
      expect(txCharacter.updateMany).toHaveBeenCalledWith({
        where: { userId: { in: ['u1', 'u2'] }, title: { in: ['Bard'] } },
        data: { title: null }
      })
    })

    it('skips character clear when no titles removed', async () => {
      txGuild.findUnique.mockResolvedValue({ availableTitles: ['Tank'] })

      await service.updateTitlePool({ guildSlug: 'g-slug', titles: ['Tank', 'Healer'] }, 'actor')

      expect(txCharacter.updateMany).not.toHaveBeenCalled()
    })

    it('throws notFound when guild missing', async () => {
      txGuild.findUnique.mockResolvedValue(null)
      await expect(
        service.updateTitlePool({ guildSlug: 'g-slug', titles: ['Tank'] }, 'actor')
      ).rejects.toBeInstanceOf(TRPCError)
    })
  })

  describe('updateMemberTitle', () => {
    const guildSlug = 'g-slug'
    const memberPublicId = 'mem-pub'
    const guildId = BigInt(1)

    function arrangeActor(role: string) {
      memberRepo.findByUserAndGuild.mockResolvedValue({
        id: BigInt(11),
        userId: 'actor',
        role,
        guildId
      })
    }

    function arrangeTarget(role: string, userId = 'target', memberId = BigInt(12)) {
      memberRepo.findById.mockResolvedValue({ id: memberId, userId, role, guildId })
    }

    beforeEach(() => {
      guildRepo.findById.mockResolvedValue({ id: guildId, availableTitles: ['Tank', 'Healer'] })
      characterRepo.findByUserId.mockResolvedValue({ id: BigInt(40), userId: 'target' })
    })

    it('rejects when title is not in guild pool', async () => {
      arrangeActor(GuildRole.GUILD_MASTER)
      arrangeTarget(GuildRole.MEMBER)
      await expect(
        service.updateMemberTitle({ guildSlug, memberPublicId, title: 'Ghost' }, 'actor')
      ).rejects.toThrow('not in the guild title pool')
    })

    it('rejects when caller tries to title themselves', async () => {
      arrangeActor(GuildRole.GUILD_MASTER)
      memberRepo.findById.mockResolvedValue({ id: BigInt(11), userId: 'actor', role: GuildRole.GUILD_MASTER, guildId })
      await expect(
        service.updateMemberTitle({ guildSlug, memberPublicId, title: 'Tank' }, 'actor')
      ).rejects.toThrow('cannot title yourself')
    })

    it('rejects retitling the guild master', async () => {
      arrangeActor(GuildRole.GUILD_MASTER)
      arrangeTarget(GuildRole.GUILD_MASTER, 'gm', BigInt(15))
      await expect(
        service.updateMemberTitle({ guildSlug, memberPublicId, title: 'Tank' }, 'actor')
      ).rejects.toThrow('Cannot retitle the guild master')
    })

    it('rejects captain retitling another captain', async () => {
      arrangeActor(GuildRole.CAPTAIN)
      arrangeTarget(GuildRole.CAPTAIN)
      await expect(
        service.updateMemberTitle({ guildSlug, memberPublicId, title: 'Tank' }, 'actor')
      ).rejects.toThrow('Captains cannot retitle other captains')
    })

    it('rejects when target belongs to a different guild', async () => {
      arrangeActor(GuildRole.GUILD_MASTER)
      memberRepo.findById.mockResolvedValue({ id: BigInt(12), userId: 'target', role: GuildRole.MEMBER, guildId: BigInt(2) })
      await expect(
        service.updateMemberTitle({ guildSlug, memberPublicId, title: 'Tank' }, 'actor')
      ).rejects.toBeInstanceOf(TRPCError)
    })

    it('assigns title on character when valid', async () => {
      arrangeActor(GuildRole.CAPTAIN)
      arrangeTarget(GuildRole.MEMBER)
      const result = await service.updateMemberTitle({ guildSlug, memberPublicId, title: 'Tank' }, 'actor')
      expect(characterRepo.updateTitle).toHaveBeenCalledWith(BigInt(40), 'Tank')
      expect(result.title).toBe('Tank')
    })

    it('clears title when null', async () => {
      arrangeActor(GuildRole.GUILD_MASTER)
      arrangeTarget(GuildRole.MEMBER)
      await service.updateMemberTitle({ guildSlug, memberPublicId, title: null }, 'actor')
      expect(characterRepo.updateTitle).toHaveBeenCalledWith(BigInt(40), null)
    })
  })

  describe('getMyGuild', () => {
    it('returns null when no membership', async () => {
      memberRepo.findByUserIdWithGuildAndMembers.mockResolvedValue(null)
      const out = await service.getMyGuild('u1')
      expect(out).toBeNull()
    })

    it('returns guild + role + memberId', async () => {
      memberRepo.findByUserIdWithGuildAndMembers.mockResolvedValue({
        publicId: 'mem-pub',
        role: GuildRole.GUILD_MASTER,
        guildId: BigInt(1),
        guild: { slug: 'g-slug', members: [] }
      })
      const out = await service.getMyGuild('u1')
      expect(out?.myMemberPublicId).toBe('mem-pub')
      expect(out?.myRole).toBe(GuildRole.GUILD_MASTER)
      expect(out?.guild.slug).toBe('g-slug')
    })
  })
})
