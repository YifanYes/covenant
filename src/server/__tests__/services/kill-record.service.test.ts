import { CharacterClassName, calculateMaxStats } from '@/shared/constants/classes.constants'
import { TRPCError } from '@trpc/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CharacterRepository } from '../../repositories/character.repository'
import type { CombatEnemyRepository } from '../../repositories/combat-enemy.repository'
import { KillRecordService } from '../../services/kill-record.service'
import { createRepoMock } from '../helpers/mock-repo'

describe('KillRecordService', () => {
  let killRecordService: KillRecordService
  let mockCharacterRepo: ReturnType<typeof createRepoMock<CharacterRepository>>
  let mockCombatEnemyRepo: ReturnType<typeof createRepoMock<CombatEnemyRepository>>

  const mockCharWithClasses = (overrides: Record<string, unknown> = {}) => ({
    id: 'char-1',
    userId: 'user-1',
    currentClass: CharacterClassName.TEMPLAR,
    classes: [
      {
        id: 'class-1',
        className: CharacterClassName.TEMPLAR,
        tier: 1
      }
    ],
    ...overrides
  })

  beforeEach(() => {
    vi.clearAllMocks()

    mockCharacterRepo = createRepoMock<CharacterRepository>()
    mockCombatEnemyRepo = createRepoMock<CombatEnemyRepository>()

    killRecordService = new KillRecordService(mockCharacterRepo, mockCombatEnemyRepo)
  })

  describe('getKillRecord', () => {
    it('returns empty when no character', async () => {
      mockCharacterRepo.findByUserId.mockResolvedValue(null)
      const result = await killRecordService.getKillRecord('user-1')
      expect(result).toEqual({ enemies: [], nextCursor: undefined })
      expect(mockCombatEnemyRepo.getDefeatedEnemiesByCharacter).not.toHaveBeenCalled()
    })

    it('paginates: returns limit and nextCursor when more rows exist', async () => {
      mockCharacterRepo.findByUserId.mockResolvedValue({ id: 'char-1' })
      const rows = Array.from({ length: 4 }, (_, i) => ({ id: `e-${i}` }))
      mockCombatEnemyRepo.getDefeatedEnemiesByCharacter.mockResolvedValue(rows)

      const result = await killRecordService.getKillRecord('user-1', 3)

      expect(mockCombatEnemyRepo.getDefeatedEnemiesByCharacter).toHaveBeenCalledWith('char-1', 4, undefined)
      expect(result.enemies).toHaveLength(3)
      expect(result.nextCursor).toBe('e-2')
    })

    it('no nextCursor when fewer rows than limit+1', async () => {
      mockCharacterRepo.findByUserId.mockResolvedValue({ id: 'char-1' })
      mockCombatEnemyRepo.getDefeatedEnemiesByCharacter.mockResolvedValue([{ id: 'e-0' }, { id: 'e-1' }])

      const result = await killRecordService.getKillRecord('user-1', 3)

      expect(result.enemies).toHaveLength(2)
      expect(result.nextCursor).toBeUndefined()
    })

    it('passes cursor through to repo', async () => {
      mockCharacterRepo.findByUserId.mockResolvedValue({ id: 'char-1' })
      mockCombatEnemyRepo.getDefeatedEnemiesByCharacter.mockResolvedValue([])
      await killRecordService.getKillRecord('user-1', 10, 'cursor-x')
      expect(mockCombatEnemyRepo.getDefeatedEnemiesByCharacter).toHaveBeenCalledWith('char-1', 11, 'cursor-x')
    })
  })

  describe('getKillStats', () => {
    it('returns zeroed stats when no character', async () => {
      mockCharacterRepo.findByUserId.mockResolvedValue(null)
      const result = await killRecordService.getKillStats('user-1')
      expect(result).toEqual({ totalKills: 0, totalDamageDealt: 0, totalDamageTaken: 0, totalCriticalHits: 0 })
    })

    it('delegates to repo when character exists', async () => {
      mockCharacterRepo.findByUserId.mockResolvedValue({ id: 'char-1' })
      mockCombatEnemyRepo.getKillStats.mockResolvedValue({
        totalKills: 5,
        totalDamageDealt: 100,
        totalDamageTaken: 50,
        totalCriticalHits: 2
      })

      const result = await killRecordService.getKillStats('user-1')

      expect(mockCombatEnemyRepo.getKillStats).toHaveBeenCalledWith('char-1')
      expect(result.totalKills).toBe(5)
    })
  })

  describe('checkAndApplyTierProgression', () => {
    it('throws NOT_FOUND when character missing', async () => {
      mockCharacterRepo.findWithClasses.mockResolvedValue(null)
      await expect(killRecordService.checkAndApplyTierProgression('user-1')).rejects.toThrow(TRPCError)
    })

    it('throws INTERNAL_SERVER_ERROR when currentClass not in classes list', async () => {
      mockCharacterRepo.findWithClasses.mockResolvedValue(
        mockCharWithClasses({
          currentClass: CharacterClassName.INQUISITOR,
          classes: [{ id: 'class-1', className: CharacterClassName.TEMPLAR, tier: 1 }]
        })
      )
      mockCombatEnemyRepo.getKillStats.mockResolvedValue({ totalKills: 0 })

      await expect(killRecordService.checkAndApplyTierProgression('user-1')).rejects.toMatchObject({
        code: 'INTERNAL_SERVER_ERROR'
      })
    })

    it('promotes tier 1 → tier 2 at 10 kills, calls updateProgress with new max stats', async () => {
      mockCharacterRepo.findWithClasses.mockResolvedValue(mockCharWithClasses())
      mockCombatEnemyRepo.getKillStats.mockResolvedValue({ totalKills: 10 })

      const result = await killRecordService.checkAndApplyTierProgression('user-1')

      const expected = calculateMaxStats(CharacterClassName.TEMPLAR, 2)
      expect(mockCharacterRepo.updateProgress).toHaveBeenCalledWith('class-1', 2, expected.maxHealth, expected.maxMana)
      expect(result).toEqual({ tierChanged: true, oldTier: 1, newTier: 2 })
    })

    it('promotes directly to tier 3 at 30 kills from tier 1', async () => {
      mockCharacterRepo.findWithClasses.mockResolvedValue(mockCharWithClasses())
      mockCombatEnemyRepo.getKillStats.mockResolvedValue({ totalKills: 30 })

      const result = await killRecordService.checkAndApplyTierProgression('user-1')

      expect(result).toEqual({ tierChanged: true, oldTier: 1, newTier: 3 })
    })

    it('does not promote when kills below threshold', async () => {
      mockCharacterRepo.findWithClasses.mockResolvedValue(mockCharWithClasses())
      mockCombatEnemyRepo.getKillStats.mockResolvedValue({ totalKills: 9 })

      const result = await killRecordService.checkAndApplyTierProgression('user-1')

      expect(mockCharacterRepo.updateProgress).not.toHaveBeenCalled()
      expect(result).toEqual({ tierChanged: false, oldTier: 1, newTier: 1 })
    })

    it('caps at MAX_BETA_TIER (3) even with excess kills', async () => {
      mockCharacterRepo.findWithClasses.mockResolvedValue(
        mockCharWithClasses({
          classes: [{ id: 'class-1', className: CharacterClassName.TEMPLAR, tier: 3 }]
        })
      )
      mockCombatEnemyRepo.getKillStats.mockResolvedValue({ totalKills: 999 })

      const result = await killRecordService.checkAndApplyTierProgression('user-1')

      expect(mockCharacterRepo.updateProgress).not.toHaveBeenCalled()
      expect(result.tierChanged).toBe(false)
    })
  })

  describe('checkAndApplyTierProgressionByCharacterId', () => {
    it('uses findByIdWithClasses lookup', async () => {
      mockCharacterRepo.findByIdWithClasses.mockResolvedValue(mockCharWithClasses())
      mockCombatEnemyRepo.getKillStats.mockResolvedValue({ totalKills: 10 })

      await killRecordService.checkAndApplyTierProgressionByCharacterId('char-1')

      expect(mockCharacterRepo.findByIdWithClasses).toHaveBeenCalledWith('char-1')
    })

    it('throws NOT_FOUND when character missing', async () => {
      mockCharacterRepo.findByIdWithClasses.mockResolvedValue(null)
      await expect(killRecordService.checkAndApplyTierProgressionByCharacterId('char-1')).rejects.toThrow(TRPCError)
    })
  })

  describe('getTierProgressInfo', () => {
    it('returns defaults when no character', async () => {
      mockCharacterRepo.findWithClasses.mockResolvedValue(null)
      const result = await killRecordService.getTierProgressInfo('user-1')
      expect(result).toEqual({ currentTier: 1, progress: null })
    })

    it('returns defaults when currentClass missing from classes', async () => {
      mockCharacterRepo.findWithClasses.mockResolvedValue(
        mockCharWithClasses({
          currentClass: CharacterClassName.HERALD,
          classes: [{ id: 'class-1', className: CharacterClassName.TEMPLAR, tier: 1 }]
        })
      )
      const result = await killRecordService.getTierProgressInfo('user-1')
      expect(result).toEqual({ currentTier: 1, progress: null })
    })

    it('returns progress toward next tier', async () => {
      mockCharacterRepo.findWithClasses.mockResolvedValue(mockCharWithClasses())
      mockCombatEnemyRepo.getKillStats.mockResolvedValue({ totalKills: 5 })

      const result = await killRecordService.getTierProgressInfo('user-1')

      expect(result.currentTier).toBe(1)
      expect(result.progress).toEqual({
        currentKills: 5,
        requiredKills: 10,
        percentage: 50,
        nextTier: 2
      })
    })

    it('returns null progress at max tier', async () => {
      mockCharacterRepo.findWithClasses.mockResolvedValue(
        mockCharWithClasses({
          classes: [{ id: 'class-1', className: CharacterClassName.TEMPLAR, tier: 3 }]
        })
      )
      mockCombatEnemyRepo.getKillStats.mockResolvedValue({ totalKills: 100 })

      const result = await killRecordService.getTierProgressInfo('user-1')

      expect(result).toEqual({ currentTier: 3, progress: null })
    })
  })
})
