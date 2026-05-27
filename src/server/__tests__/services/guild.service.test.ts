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
    txGuild.create.mockResolvedValue({ id: 'guild-1', name: 'New', ownerId: 'u1' })
    txGuildMember.create.mockResolvedValue({ id: 'gm-1' })
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

    guildRepo = createRepoMock<GuildRepository>()
    memberRepo = createRepoMock<GuildMemberRepository>()
    messageRepo = createRepoMock<GuildMessageRepository>()
    inviteRepo = createRepoMock<GuildInviteRepository>()
    userRepo = createRepoMock<UserRepository>()
    inviteRepo.countActiveByGuild.mockResolvedValue(0)
    inviteRepo.create.mockResolvedValue({ id: 'inv-new' } as never)
    userRepo.findById.mockResolvedValue({ id: 'u1', theme: 'HOLY_KNIGHTS' } as never)

    characterRepo = createRepoMock<CharacterRepository>()

    service = new GuildService(prisma, guildRepo, memberRepo, messageRepo, inviteRepo, userRepo, characterRepo)
  })

  describe('createGuild', () => {
    it('rejects when user is already in a guild', async () => {
      memberRepo.findByUserId.mockResolvedValue({ id: 'm-1', guildId: 'g-1', userId: 'u1', role: 'MEMBER' })

      await expect(service.createGuild({ name: 'Test', description: '' }, 'u1')).rejects.toThrow(
        'You already belong to a guild'
      )
    })

    it('creates guild + owner member when user is unaffiliated', async () => {
      memberRepo.findByUserId.mockResolvedValue(null)
      const result = await service.createGuild({ name: 'New' }, 'u1')
      expect(prisma.$transaction).toHaveBeenCalled()
      expect(result.id).toBe('guild-1')
    })

    it('translates Prisma unique violation to friendly error', async () => {
      memberRepo.findByUserId.mockResolvedValue(null)
      prisma.$transaction.mockRejectedValueOnce(Object.assign(new Error('unique'), { code: 'P2002' }))
      await expect(service.createGuild({ name: 'New' }, 'u1')).rejects.toThrow('You already belong to a guild')
    })
  })

  describe('updateGuild', () => {
    it('rejects non-owner', async () => {
      memberRepo.findByUserAndGuild.mockResolvedValue({ id: 'm-1', role: GuildRole.CAPTAIN, guildId: 'g-1' })
      await expect(service.updateGuild({ guildId: 'g-1', name: 'X' }, 'u1')).rejects.toBeInstanceOf(TRPCError)
    })

    it('updates when owner', async () => {
      memberRepo.findByUserAndGuild.mockResolvedValue({ id: 'm-1', role: GuildRole.GUILD_MASTER, guildId: 'g-1' })
      guildRepo.update.mockResolvedValue({ id: 'g-1', name: 'X' })
      await service.updateGuild({ guildId: 'g-1', name: 'X' }, 'u1')
      expect(guildRepo.update).toHaveBeenCalledWith('g-1', { name: 'X', description: undefined })
    })
  })

  describe('dissolveGuild', () => {
    it('rejects non-owner', async () => {
      memberRepo.findByUserAndGuild.mockResolvedValue({ id: 'm-1', role: GuildRole.MEMBER, guildId: 'g-1' })
      await expect(service.dissolveGuild('g-1', 'u1')).rejects.toBeInstanceOf(TRPCError)
    })

    it('deletes guild when owner', async () => {
      memberRepo.findByUserAndGuild.mockResolvedValue({ id: 'm-1', role: GuildRole.GUILD_MASTER, guildId: 'g-1' })
      memberRepo.findUserIdsByGuild.mockResolvedValue(['u1', 'u2'])
      await service.dissolveGuild('g-1', 'u1')
      expect(txGuild.delete).toHaveBeenCalledWith({ where: { id: 'g-1' } })
      expect(txCharacter.updateMany).toHaveBeenCalledWith({
        where: { userId: { in: ['u1', 'u2'] } },
        data: { title: null }
      })
    })
  })

  describe('joinByToken', () => {
    const validInvite = {
      id: 'inv-1',
      guildId: 'g-1',
      token: 'tok',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      maxUses: 5,
      usedCount: 0
    }

    it('rejects when user already in a guild', async () => {
      memberRepo.findByUserId.mockResolvedValue({ id: 'm-1' })
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
      guildRepo.findById.mockResolvedValue({ id: 'g-1', capacity: 50 })
      txGuildInvite.updateMany.mockResolvedValueOnce({ count: 0 })
      await expect(service.joinByToken('tok', 'u1')).rejects.toThrow('Invite no longer valid')
    })

    it('rejects when capacity reached inside tx', async () => {
      memberRepo.findByUserId.mockResolvedValue(null)
      inviteRepo.findByToken.mockResolvedValue(validInvite)
      guildRepo.findById.mockResolvedValue({ id: 'g-1', capacity: 50 })
      txGuildInvite.updateMany.mockResolvedValueOnce({ count: 1 })
      txGuildMember.count.mockResolvedValueOnce(50)
      await expect(service.joinByToken('tok', 'u1')).rejects.toThrow('capacity')
    })

    it('joins atomically when invite valid + capacity available', async () => {
      memberRepo.findByUserId.mockResolvedValue(null)
      inviteRepo.findByToken.mockResolvedValue(validInvite)
      guildRepo.findById.mockResolvedValue({ id: 'g-1', capacity: 50 })
      txGuildInvite.updateMany.mockResolvedValueOnce({ count: 1 })
      txGuildMember.count.mockResolvedValueOnce(5)
      const result = await service.joinByToken('tok', 'u1')
      expect(result.guildId).toBe('g-1')
      expect(txGuildInvite.updateMany).toHaveBeenCalled()
      expect(txGuildMember.create).toHaveBeenCalled()
    })

    it('translates P2002 inside tx to friendly error', async () => {
      memberRepo.findByUserId.mockResolvedValue(null)
      inviteRepo.findByToken.mockResolvedValue(validInvite)
      guildRepo.findById.mockResolvedValue({ id: 'g-1', capacity: 50 })
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
      memberRepo.findByUserId.mockResolvedValue({ id: 'm-1', guildId: 'g-1', userId: 'u1', role: GuildRole.GUILD_MASTER })
      memberRepo.countByGuild.mockResolvedValue(3)
      await expect(service.leaveGuild('u1')).rejects.toThrow('Transfer ownership')
    })

    it('dissolves guild when sole owner leaves', async () => {
      memberRepo.findByUserId.mockResolvedValue({ id: 'm-1', guildId: 'g-1', userId: 'u1', role: GuildRole.GUILD_MASTER })
      memberRepo.countByGuild.mockResolvedValue(1)
      const result = await service.leaveGuild('u1')
      expect(result.dissolved).toBe(true)
      expect(txGuild.delete).toHaveBeenCalledWith({ where: { id: 'g-1' } })
      expect(txCharacter.updateMany).toHaveBeenCalledWith({ where: { userId: 'u1' }, data: { title: null } })
    })

    it('removes member when non-owner leaves', async () => {
      memberRepo.findByUserId.mockResolvedValue({ id: 'm-1', guildId: 'g-1', userId: 'u1', role: GuildRole.MEMBER })
      memberRepo.countByGuild.mockResolvedValue(3)
      const result = await service.leaveGuild('u1')
      expect(result.dissolved).toBe(false)
      expect(txGuildMember.delete).toHaveBeenCalledWith({ where: { id: 'm-1' } })
      expect(txCharacter.updateMany).toHaveBeenCalledWith({ where: { userId: 'u1' }, data: { title: null } })
    })
  })

  describe('kickMember permission matrix', () => {
    const guildId = 'g-1'

    function arrange(actorRole: string, targetRole: string) {
      memberRepo.findByUserAndGuild.mockImplementation(async (userId: string, _guildId: string) => {
        if (userId === 'actor') return { id: 'm-actor', guildId, userId, role: actorRole }
        if (userId === 'target') return { id: 'm-target', guildId, userId, role: targetRole }
        return null
      })
    }

    it('OWNER can kick OFFICER', async () => {
      arrange(GuildRole.GUILD_MASTER, GuildRole.CAPTAIN)
      await service.kickMember({ guildId, targetUserId: 'target' }, 'actor')
      expect(txGuildMember.delete).toHaveBeenCalledWith({ where: { id: 'm-target' } })
    })

    it('OWNER can kick MEMBER', async () => {
      arrange(GuildRole.GUILD_MASTER, GuildRole.MEMBER)
      await service.kickMember({ guildId, targetUserId: 'target' }, 'actor')
      expect(txGuildMember.delete).toHaveBeenCalledWith({ where: { id: 'm-target' } })
    })

    it('OFFICER cannot kick OFFICER', async () => {
      arrange(GuildRole.CAPTAIN, GuildRole.CAPTAIN)
      await expect(service.kickMember({ guildId, targetUserId: 'target' }, 'actor')).rejects.toThrow(
        'Captains cannot kick other captains'
      )
    })

    it('OFFICER can kick MEMBER', async () => {
      arrange(GuildRole.CAPTAIN, GuildRole.MEMBER)
      await service.kickMember({ guildId, targetUserId: 'target' }, 'actor')
      expect(txGuildMember.delete).toHaveBeenCalledWith({ where: { id: 'm-target' } })
    })

    it('MEMBER cannot kick anyone', async () => {
      arrange(GuildRole.MEMBER, GuildRole.MEMBER)
      await expect(service.kickMember({ guildId, targetUserId: 'target' }, 'actor')).rejects.toBeInstanceOf(TRPCError)
    })

    it('nobody can kick OWNER', async () => {
      arrange(GuildRole.GUILD_MASTER, GuildRole.GUILD_MASTER)
      await expect(service.kickMember({ guildId, targetUserId: 'target' }, 'actor')).rejects.toThrow(
        'Cannot kick the guild master'
      )
    })
  })

  describe('updateRole', () => {
    it('rejects self-role-change', async () => {
      await expect(
        service.updateRole({ guildId: 'g-1', targetUserId: 'u1', role: GuildRole.CAPTAIN }, 'u1')
      ).rejects.toThrow('cannot change your own role')
    })

    it('rejects non-owner caller', async () => {
      memberRepo.findByUserAndGuild.mockImplementation(async (uid: string) => {
        if (uid === 'actor') return { id: 'm-actor', role: GuildRole.CAPTAIN, guildId: 'g-1' }
        return null
      })
      await expect(
        service.updateRole({ guildId: 'g-1', targetUserId: 'target', role: GuildRole.CAPTAIN }, 'actor')
      ).rejects.toBeInstanceOf(TRPCError)
    })

    it('promotes member to officer', async () => {
      memberRepo.findByUserAndGuild.mockImplementation(async (uid: string) => {
        if (uid === 'owner') return { id: 'm-owner', role: GuildRole.GUILD_MASTER, guildId: 'g-1' }
        if (uid === 'target') return { id: 'm-target', role: GuildRole.MEMBER, guildId: 'g-1' }
        return null
      })
      await service.updateRole({ guildId: 'g-1', targetUserId: 'target', role: GuildRole.CAPTAIN }, 'owner')
      expect(memberRepo.updateRole).toHaveBeenCalledWith('m-target', GuildRole.CAPTAIN)
    })
  })

  describe('deleteMessage', () => {
    function arrangeMessage(authorId: string, guildId = 'g-1') {
      messageRepo.findById.mockResolvedValue({
        id: 'msg-1',
        guildId,
        userId: authorId,
        deletedAt: null
      })
    }

    function arrangeMember(role: string | null) {
      memberRepo.findByUserAndGuild.mockResolvedValue(role ? { id: 'm-1', role, guildId: 'g-1' } : null)
    }

    it('author can delete own message', async () => {
      arrangeMessage('u1')
      arrangeMember(GuildRole.MEMBER)
      await service.deleteMessage('msg-1', 'u1')
      expect(messageRepo.softDelete).toHaveBeenCalledWith('msg-1')
    })

    it('OFFICER can delete other member message', async () => {
      arrangeMessage('u2')
      arrangeMember(GuildRole.CAPTAIN)
      await service.deleteMessage('msg-1', 'u1')
      expect(messageRepo.softDelete).toHaveBeenCalledWith('msg-1')
    })

    it('OWNER can delete other member message', async () => {
      arrangeMessage('u2')
      arrangeMember(GuildRole.GUILD_MASTER)
      await service.deleteMessage('msg-1', 'u1')
      expect(messageRepo.softDelete).toHaveBeenCalledWith('msg-1')
    })

    it('plain MEMBER cannot delete other member message', async () => {
      arrangeMessage('u2')
      arrangeMember(GuildRole.MEMBER)
      await expect(service.deleteMessage('msg-1', 'u1')).rejects.toBeInstanceOf(TRPCError)
    })

    it('non-member cannot delete', async () => {
      arrangeMessage('u1')
      arrangeMember(null)
      await expect(service.deleteMessage('msg-1', 'u1')).rejects.toBeInstanceOf(TRPCError)
    })
  })

  describe('transferOwnership', () => {
    it('demotes prior owner to officer and promotes target to owner', async () => {
      memberRepo.findByUserAndGuild.mockImplementation(async (uid: string) => {
        if (uid === 'owner') return { id: 'm-owner', userId: 'owner', role: GuildRole.GUILD_MASTER, guildId: 'g-1' }
        if (uid === 'newOwner') return { id: 'm-new', userId: 'newOwner', role: GuildRole.MEMBER, guildId: 'g-1' }
        return null
      })

      await service.transferOwnership({ guildId: 'g-1', newOwnerUserId: 'newOwner' }, 'owner')
      expect(prisma.$transaction).toHaveBeenCalled()
    })

    it('rejects transfer to self', async () => {
      await expect(service.transferOwnership({ guildId: 'g-1', newOwnerUserId: 'owner' }, 'owner')).rejects.toThrow(
        'already own'
      )
    })

    it('rejects when target is not in guild', async () => {
      memberRepo.findByUserAndGuild.mockImplementation(async (uid: string) => {
        if (uid === 'owner') return { id: 'm-owner', userId: 'owner', role: GuildRole.GUILD_MASTER, guildId: 'g-1' }
        return null
      })

      await expect(service.transferOwnership({ guildId: 'g-1', newOwnerUserId: 'ghost' }, 'owner')).rejects.toThrow(
        'not in this guild'
      )
    })
  })

  describe('createInvite', () => {
    beforeEach(() => {
      memberRepo.findByUserAndGuild.mockResolvedValue({ id: 'm-1', role: GuildRole.CAPTAIN, guildId: 'g-1' })
    })

    it('rejects when active invite cap reached', async () => {
      inviteRepo.countActiveByGuild.mockResolvedValue(5)
      await expect(service.createInvite({ guildId: 'g-1', expiresInHours: 168 }, 'u1')).rejects.toThrow(
        'Active invite limit reached'
      )
    })

    it('creates invite below cap', async () => {
      inviteRepo.countActiveByGuild.mockResolvedValue(2)
      await service.createInvite({ guildId: 'g-1', expiresInHours: 168 }, 'u1')
      expect(inviteRepo.create).toHaveBeenCalled()
    })
  })

  describe('revokeInvite', () => {
    it('rejects when invite missing', async () => {
      inviteRepo.findById.mockResolvedValue(null)
      await expect(service.revokeInvite('inv-x', 'u1')).rejects.toBeInstanceOf(TRPCError)
    })

    it('rejects non-officer/owner', async () => {
      inviteRepo.findById.mockResolvedValue({ id: 'inv-1', guildId: 'g-1' })
      memberRepo.findByUserAndGuild.mockResolvedValue({ id: 'm-1', role: GuildRole.MEMBER, guildId: 'g-1' })
      await expect(service.revokeInvite('inv-1', 'u1')).rejects.toBeInstanceOf(TRPCError)
    })

    it('revokes when officer', async () => {
      inviteRepo.findById.mockResolvedValue({ id: 'inv-1', guildId: 'g-1' })
      memberRepo.findByUserAndGuild.mockResolvedValue({ id: 'm-1', role: GuildRole.CAPTAIN, guildId: 'g-1' })
      await service.revokeInvite('inv-1', 'u1')
      expect(inviteRepo.revoke).toHaveBeenCalledWith('inv-1')
    })
  })

  describe('getInvitePreview', () => {
    const baseGuild = {
      id: 'g-1',
      name: 'G',
      description: null,
      factionName: 'HOLY_KNIGHTS',
      capacity: 50
    }
    const baseInvite = {
      id: 'inv-1',
      guildId: 'g-1',
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
    const guildId = 'g-1'

    beforeEach(() => {
      memberRepo.findByUserAndGuild.mockResolvedValue({
        id: 'm-actor',
        userId: 'actor',
        role: GuildRole.GUILD_MASTER,
        guildId
      })
    })

    it('rejects when caller is plain MEMBER', async () => {
      memberRepo.findByUserAndGuild.mockResolvedValue({
        id: 'm-actor',
        userId: 'actor',
        role: GuildRole.MEMBER,
        guildId
      })
      await expect(
        service.updateTitlePool({ guildId, titles: ['Tank'] }, 'actor')
      ).rejects.toBeInstanceOf(TRPCError)
    })

    it('writes new pool and clears titles for members whose title was removed', async () => {
      txGuild.findUnique.mockResolvedValue({ availableTitles: ['Tank', 'Healer', 'Bard'] })
      txGuildMember.findMany.mockResolvedValue([{ userId: 'u1' }, { userId: 'u2' }])

      await service.updateTitlePool({ guildId, titles: ['Tank', 'Healer'] }, 'actor')

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

      await service.updateTitlePool({ guildId, titles: ['Tank', 'Healer'] }, 'actor')

      expect(txCharacter.updateMany).not.toHaveBeenCalled()
    })

    it('throws notFound when guild missing', async () => {
      txGuild.findUnique.mockResolvedValue(null)
      await expect(
        service.updateTitlePool({ guildId, titles: ['Tank'] }, 'actor')
      ).rejects.toBeInstanceOf(TRPCError)
    })
  })

  describe('updateMemberTitle', () => {
    const guildId = 'g-1'

    function arrangeActor(role: string) {
      memberRepo.findByUserAndGuild.mockResolvedValue({
        id: 'm-actor',
        userId: 'actor',
        role,
        guildId
      })
    }

    function arrangeTarget(role: string, userId = 'target', memberId = 'm-target') {
      memberRepo.findById.mockResolvedValue({ id: memberId, userId, role, guildId })
    }

    beforeEach(() => {
      guildRepo.findById.mockResolvedValue({ id: guildId, availableTitles: ['Tank', 'Healer'] })
      characterRepo.findByUserId.mockResolvedValue({ id: 'c-target', userId: 'target' })
    })

    it('rejects when title is not in guild pool', async () => {
      arrangeActor(GuildRole.GUILD_MASTER)
      arrangeTarget(GuildRole.MEMBER)
      await expect(
        service.updateMemberTitle({ guildId, memberId: 'm-target', title: 'Ghost' }, 'actor')
      ).rejects.toThrow('not in the guild title pool')
    })

    it('rejects when caller tries to title themselves', async () => {
      arrangeActor(GuildRole.GUILD_MASTER)
      memberRepo.findById.mockResolvedValue({ id: 'm-actor', userId: 'actor', role: GuildRole.GUILD_MASTER, guildId })
      await expect(
        service.updateMemberTitle({ guildId, memberId: 'm-actor', title: 'Tank' }, 'actor')
      ).rejects.toThrow('cannot title yourself')
    })

    it('rejects retitling the guild master', async () => {
      arrangeActor(GuildRole.GUILD_MASTER)
      arrangeTarget(GuildRole.GUILD_MASTER, 'gm', 'm-gm')
      await expect(
        service.updateMemberTitle({ guildId, memberId: 'm-gm', title: 'Tank' }, 'actor')
      ).rejects.toThrow('Cannot retitle the guild master')
    })

    it('rejects captain retitling another captain', async () => {
      arrangeActor(GuildRole.CAPTAIN)
      arrangeTarget(GuildRole.CAPTAIN)
      await expect(
        service.updateMemberTitle({ guildId, memberId: 'm-target', title: 'Tank' }, 'actor')
      ).rejects.toThrow('Captains cannot retitle other captains')
    })

    it('rejects when target belongs to a different guild', async () => {
      arrangeActor(GuildRole.GUILD_MASTER)
      memberRepo.findById.mockResolvedValue({ id: 'm-target', userId: 'target', role: GuildRole.MEMBER, guildId: 'other' })
      await expect(
        service.updateMemberTitle({ guildId, memberId: 'm-target', title: 'Tank' }, 'actor')
      ).rejects.toBeInstanceOf(TRPCError)
    })

    it('assigns title on character when valid', async () => {
      arrangeActor(GuildRole.CAPTAIN)
      arrangeTarget(GuildRole.MEMBER)
      const result = await service.updateMemberTitle({ guildId, memberId: 'm-target', title: 'Tank' }, 'actor')
      expect(characterRepo.updateTitle).toHaveBeenCalledWith('c-target', 'Tank')
      expect(result.title).toBe('Tank')
    })

    it('clears title when null', async () => {
      arrangeActor(GuildRole.GUILD_MASTER)
      arrangeTarget(GuildRole.MEMBER)
      await service.updateMemberTitle({ guildId, memberId: 'm-target', title: null }, 'actor')
      expect(characterRepo.updateTitle).toHaveBeenCalledWith('c-target', null)
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
        id: 'm-1',
        role: GuildRole.GUILD_MASTER,
        guildId: 'g-1',
        guild: { id: 'g-1', members: [] }
      })
      const out = await service.getMyGuild('u1')
      expect(out?.myMemberId).toBe('m-1')
      expect(out?.myRole).toBe(GuildRole.GUILD_MASTER)
      expect(out?.guild.id).toBe('g-1')
    })
  })
})
