import { TRPCError } from '@trpc/server'
import { GuildRole } from '@shared/schemas/guilds.schemas'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GuildService, INVITE_INVALID_REASON } from '../../services/guild.service'

describe('GuildService', () => {
  let service: GuildService
  let prisma: any
  let txGuildInvite: any
  let txGuildMember: any
  let guildRepo: any
  let memberRepo: any
  let messageRepo: any
  let inviteRepo: any
  let userRepo: any

  beforeEach(() => {
    vi.clearAllMocks()

    txGuildInvite = {
      update: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 1 })
    }
    txGuildMember = {
      create: vi.fn().mockResolvedValue({ id: 'gm-1' }),
      update: vi.fn(),
      count: vi.fn().mockResolvedValue(1)
    }

    prisma = {
      $transaction: vi.fn(async (fn: any) => {
        return fn({
          guild: {
            create: vi.fn().mockResolvedValue({ id: 'guild-1', name: 'New', ownerId: 'u1' }),
            update: vi.fn()
          },
          guildMember: txGuildMember,
          guildInvite: txGuildInvite
        })
      })
    }

    guildRepo = {
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    }
    memberRepo = {
      findByUserId: vi.fn(),
      findByUserIdWithGuildAndMembers: vi.fn(),
      findByUserAndGuild: vi.fn(),
      create: vi.fn(),
      updateRole: vi.fn(),
      delete: vi.fn(),
      countByGuild: vi.fn()
    }
    messageRepo = {
      findByGuild: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      softDelete: vi.fn()
    }
    inviteRepo = {
      findByToken: vi.fn(),
      findById: vi.fn(),
      findByGuild: vi.fn(),
      countActiveByGuild: vi.fn().mockResolvedValue(0),
      create: vi.fn().mockResolvedValue({ id: 'inv-new' }),
      revoke: vi.fn()
    }
    userRepo = {
      findById: vi.fn().mockResolvedValue({ id: 'u1', theme: 'HOLY_KNIGHTS' })
    }

    const characterRepo = { findByUserId: vi.fn() }

    service = new GuildService(prisma, guildRepo, memberRepo, messageRepo, inviteRepo, userRepo, characterRepo as any)
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
      memberRepo.findByUserAndGuild.mockResolvedValue({ id: 'm-1', role: GuildRole.OFFICER, guildId: 'g-1' })
      await expect(
        service.updateGuild({ guildId: 'g-1', name: 'X' }, 'u1')
      ).rejects.toBeInstanceOf(TRPCError)
    })

    it('updates when owner', async () => {
      memberRepo.findByUserAndGuild.mockResolvedValue({ id: 'm-1', role: GuildRole.OWNER, guildId: 'g-1' })
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
      memberRepo.findByUserAndGuild.mockResolvedValue({ id: 'm-1', role: GuildRole.OWNER, guildId: 'g-1' })
      await service.dissolveGuild('g-1', 'u1')
      expect(guildRepo.delete).toHaveBeenCalledWith('g-1')
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
      memberRepo.findByUserId.mockResolvedValue({ id: 'm-1', guildId: 'g-1', userId: 'u1', role: GuildRole.OWNER })
      memberRepo.countByGuild.mockResolvedValue(3)
      await expect(service.leaveGuild('u1')).rejects.toThrow('Transfer ownership')
    })

    it('dissolves guild when sole owner leaves', async () => {
      memberRepo.findByUserId.mockResolvedValue({ id: 'm-1', guildId: 'g-1', userId: 'u1', role: GuildRole.OWNER })
      memberRepo.countByGuild.mockResolvedValue(1)
      const result = await service.leaveGuild('u1')
      expect(result.dissolved).toBe(true)
      expect(guildRepo.delete).toHaveBeenCalledWith('g-1')
    })

    it('removes member when non-owner leaves', async () => {
      memberRepo.findByUserId.mockResolvedValue({ id: 'm-1', guildId: 'g-1', userId: 'u1', role: GuildRole.MEMBER })
      memberRepo.countByGuild.mockResolvedValue(3)
      const result = await service.leaveGuild('u1')
      expect(result.dissolved).toBe(false)
      expect(memberRepo.delete).toHaveBeenCalledWith('m-1')
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
      arrange(GuildRole.OWNER, GuildRole.OFFICER)
      await service.kickMember({ guildId, targetUserId: 'target' }, 'actor')
      expect(memberRepo.delete).toHaveBeenCalledWith('m-target')
    })

    it('OWNER can kick MEMBER', async () => {
      arrange(GuildRole.OWNER, GuildRole.MEMBER)
      await service.kickMember({ guildId, targetUserId: 'target' }, 'actor')
      expect(memberRepo.delete).toHaveBeenCalledWith('m-target')
    })

    it('OFFICER cannot kick OFFICER', async () => {
      arrange(GuildRole.OFFICER, GuildRole.OFFICER)
      await expect(service.kickMember({ guildId, targetUserId: 'target' }, 'actor')).rejects.toThrow(
        'Officers cannot kick'
      )
    })

    it('OFFICER can kick MEMBER', async () => {
      arrange(GuildRole.OFFICER, GuildRole.MEMBER)
      await service.kickMember({ guildId, targetUserId: 'target' }, 'actor')
      expect(memberRepo.delete).toHaveBeenCalledWith('m-target')
    })

    it('MEMBER cannot kick anyone', async () => {
      arrange(GuildRole.MEMBER, GuildRole.MEMBER)
      await expect(service.kickMember({ guildId, targetUserId: 'target' }, 'actor')).rejects.toBeInstanceOf(
        TRPCError
      )
    })

    it('nobody can kick OWNER', async () => {
      arrange(GuildRole.OWNER, GuildRole.OWNER)
      await expect(service.kickMember({ guildId, targetUserId: 'target' }, 'actor')).rejects.toThrow(
        'Cannot kick the guild owner'
      )
    })
  })

  describe('updateRole', () => {
    it('rejects self-role-change', async () => {
      await expect(
        service.updateRole({ guildId: 'g-1', targetUserId: 'u1', role: GuildRole.OFFICER }, 'u1')
      ).rejects.toThrow('cannot change your own role')
    })

    it('rejects non-owner caller', async () => {
      memberRepo.findByUserAndGuild.mockImplementation(async (uid: string) => {
        if (uid === 'actor') return { id: 'm-actor', role: GuildRole.OFFICER, guildId: 'g-1' }
        return null
      })
      await expect(
        service.updateRole({ guildId: 'g-1', targetUserId: 'target', role: GuildRole.OFFICER }, 'actor')
      ).rejects.toBeInstanceOf(TRPCError)
    })

    it('promotes member to officer', async () => {
      memberRepo.findByUserAndGuild.mockImplementation(async (uid: string) => {
        if (uid === 'owner') return { id: 'm-owner', role: GuildRole.OWNER, guildId: 'g-1' }
        if (uid === 'target') return { id: 'm-target', role: GuildRole.MEMBER, guildId: 'g-1' }
        return null
      })
      await service.updateRole({ guildId: 'g-1', targetUserId: 'target', role: GuildRole.OFFICER }, 'owner')
      expect(memberRepo.updateRole).toHaveBeenCalledWith('m-target', GuildRole.OFFICER)
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
      arrangeMember(GuildRole.OFFICER)
      await service.deleteMessage('msg-1', 'u1')
      expect(messageRepo.softDelete).toHaveBeenCalledWith('msg-1')
    })

    it('OWNER can delete other member message', async () => {
      arrangeMessage('u2')
      arrangeMember(GuildRole.OWNER)
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
        if (uid === 'owner') return { id: 'm-owner', userId: 'owner', role: GuildRole.OWNER, guildId: 'g-1' }
        if (uid === 'newOwner') return { id: 'm-new', userId: 'newOwner', role: GuildRole.MEMBER, guildId: 'g-1' }
        return null
      })

      await service.transferOwnership({ guildId: 'g-1', newOwnerUserId: 'newOwner' }, 'owner')
      expect(prisma.$transaction).toHaveBeenCalled()
    })

    it('rejects transfer to self', async () => {
      await expect(
        service.transferOwnership({ guildId: 'g-1', newOwnerUserId: 'owner' }, 'owner')
      ).rejects.toThrow('already own')
    })

    it('rejects when target is not in guild', async () => {
      memberRepo.findByUserAndGuild.mockImplementation(async (uid: string) => {
        if (uid === 'owner') return { id: 'm-owner', userId: 'owner', role: GuildRole.OWNER, guildId: 'g-1' }
        return null
      })

      await expect(
        service.transferOwnership({ guildId: 'g-1', newOwnerUserId: 'ghost' }, 'owner')
      ).rejects.toThrow('not in this guild')
    })
  })

  describe('createInvite', () => {
    beforeEach(() => {
      memberRepo.findByUserAndGuild.mockResolvedValue({ id: 'm-1', role: GuildRole.OFFICER, guildId: 'g-1' })
    })

    it('rejects when active invite cap reached', async () => {
      inviteRepo.countActiveByGuild.mockResolvedValue(5)
      await expect(
        service.createInvite({ guildId: 'g-1', expiresInHours: 168 }, 'u1')
      ).rejects.toThrow('Active invite limit reached')
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
      memberRepo.findByUserAndGuild.mockResolvedValue({ id: 'm-1', role: GuildRole.OFFICER, guildId: 'g-1' })
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

  describe('getMyGuild', () => {
    it('returns null when no membership', async () => {
      memberRepo.findByUserIdWithGuildAndMembers.mockResolvedValue(null)
      const out = await service.getMyGuild('u1')
      expect(out).toBeNull()
    })

    it('returns guild + role + memberId', async () => {
      memberRepo.findByUserIdWithGuildAndMembers.mockResolvedValue({
        id: 'm-1',
        role: GuildRole.OWNER,
        guildId: 'g-1',
        guild: { id: 'g-1', members: [] }
      })
      const out = await service.getMyGuild('u1')
      expect(out?.myMemberId).toBe('m-1')
      expect(out?.myRole).toBe(GuildRole.OWNER)
      expect(out?.guild.id).toBe('g-1')
    })
  })
})
