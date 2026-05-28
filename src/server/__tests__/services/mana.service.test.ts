import type { PrismaClient } from '@/generated/prisma'
import { CharacterClassName } from '@/shared/constants/classes.constants'
import { MANA_REWARDS } from '@/shared/constants/rewards.constants'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CharacterRepository } from '../../repositories/character.repository'
import { ManaService } from '../../services/mana.service'
import { buildCharacter } from '../fixtures/character.fixtures'
import { expectManaGrant } from '../helpers/mana'
import { createRepoMock } from '../helpers/mock-repo'

const makePrisma = () =>
  ({
    habitCompletion: { count: vi.fn() },
    task: { findMany: vi.fn() },
    objective: { count: vi.fn() },
    journalEntry: { count: vi.fn() }
  }) as unknown as PrismaClient

describe('ManaService', () => {
  let mockRepo: ReturnType<typeof createRepoMock<CharacterRepository>>
  let prisma: PrismaClient
  let service: ManaService

  beforeEach(() => {
    vi.clearAllMocks()
    mockRepo = createRepoMock<CharacterRepository>()
    prisma = makePrisma()
    service = new ManaService(mockRepo, prisma)
  })

  describe('addManaFromCompletion', () => {
    it('returns failure shape when character missing', async () => {
      mockRepo.findWithClasses.mockResolvedValue(null)

      const result = await service.addManaFromCompletion('user-1', 'habit')

      expectManaGrant(result, { success: false })
      expect(mockRepo.updateHealth).not.toHaveBeenCalled()
      expect(mockRepo.updateManaReserve).not.toHaveBeenCalled()
    })

    it('returns failure shape but preserves amount when currentClass mismatches', async () => {
      const character = buildCharacter({ mana: 0, maxMana: 10 })
      character.currentClass = CharacterClassName.HERALD
      mockRepo.findWithClasses.mockResolvedValue(character)

      const result = await service.addManaFromCompletion('user-1', 'habit')

      expectManaGrant(result, { success: false, amount: MANA_REWARDS.HABIT })
      expect(mockRepo.updateHealth).not.toHaveBeenCalled()
    })

    it('writes mana only when grant fits entirely in active bar', async () => {
      mockRepo.findWithClasses.mockResolvedValue(buildCharacter({ mana: 0, maxMana: 10, classId: BigInt(10), id: BigInt(1) }))

      const result = await service.addManaFromCompletion('user-1', 'objective')

      expectManaGrant(result, {
        amount: MANA_REWARDS.OBJECTIVE,
        manaApplied: MANA_REWARDS.OBJECTIVE,
        newMana: MANA_REWARDS.OBJECTIVE
      })
      expect(mockRepo.updateHealth).toHaveBeenCalledWith(BigInt(10), 100, MANA_REWARDS.OBJECTIVE)
      expect(mockRepo.updateManaReserve).not.toHaveBeenCalled()
    })

    it('writes both mana and reserve on overflow', async () => {
      mockRepo.findWithClasses.mockResolvedValue(
        buildCharacter({ mana: 8, maxMana: 10, reserve: 1, classId: BigInt(10), id: BigInt(1) })
      )

      const result = await service.addManaFromCompletion('user-1', 'objective')

      expectManaGrant(result, {
        amount: MANA_REWARDS.OBJECTIVE,
        manaApplied: 2,
        reserveGained: MANA_REWARDS.OBJECTIVE - 2,
        newMana: 10,
        newReserve: 1 + (MANA_REWARDS.OBJECTIVE - 2)
      })
      expect(mockRepo.updateHealth).toHaveBeenCalledWith(BigInt(10), 100, 10)
      expect(mockRepo.updateManaReserve).toHaveBeenCalledWith(BigInt(1), 1 + (MANA_REWARDS.OBJECTIVE - 2))
    })

    it('writes reserve only and skips updateHealth when mana already full', async () => {
      mockRepo.findWithClasses.mockResolvedValue(
        buildCharacter({ mana: 10, maxMana: 10, reserve: 0, classId: BigInt(10), id: BigInt(1) })
      )

      const result = await service.addManaFromCompletion('user-1', 'habit')

      expectManaGrant(result, {
        amount: MANA_REWARDS.HABIT,
        reserveGained: MANA_REWARDS.HABIT,
        newMana: 10,
        newReserve: MANA_REWARDS.HABIT
      })
      expect(mockRepo.updateHealth).not.toHaveBeenCalled()
      expect(mockRepo.updateManaReserve).toHaveBeenCalledWith(BigInt(1), MANA_REWARDS.HABIT)
    })

    it('ticks onboarding flag once when manaEarned is unset', async () => {
      mockRepo.findWithClasses.mockResolvedValue(
        buildCharacter({ mana: 0, maxMana: 10, onboardingProgress: { manaEarned: false } })
      )

      await service.addManaFromCompletion('user-1', 'habit')

      expect(mockRepo.updateOnboardingProgress).toHaveBeenCalledWith('user-1', { manaEarned: true })
    })

    it('skips onboarding tick when manaEarned already true', async () => {
      mockRepo.findWithClasses.mockResolvedValue(
        buildCharacter({ mana: 0, maxMana: 10, onboardingProgress: { manaEarned: true } })
      )

      await service.addManaFromCompletion('user-1', 'habit')

      expect(mockRepo.updateOnboardingProgress).not.toHaveBeenCalled()
    })

    it('skips onboarding tick when amount is zero', async () => {
      mockRepo.findWithClasses.mockResolvedValue(
        buildCharacter({ mana: 0, maxMana: 10, onboardingProgress: { manaEarned: false } })
      )

      await service.addManaFromCompletion('user-1', 'unknown' as never)

      expect(mockRepo.updateOnboardingProgress).not.toHaveBeenCalled()
    })

    it('swallows onboarding write errors', async () => {
      mockRepo.findWithClasses.mockResolvedValue(buildCharacter({ mana: 0, maxMana: 10 }))
      mockRepo.updateOnboardingProgress.mockRejectedValue(new Error('db down'))

      await expect(service.addManaFromCompletion('user-1', 'habit')).resolves.toMatchObject({ success: true })
    })

    it('uses task impact via getManaForSource', async () => {
      mockRepo.findWithClasses.mockResolvedValue(buildCharacter({ mana: 0, maxMana: 10 }))

      const result = await service.addManaFromCompletion('user-1', 'task', { impact: 'HIGH' })

      expect(result.amount).toBe(MANA_REWARDS.TASK_HIGH_IMPACT)
    })
  })

  describe('addManaFromCompletions', () => {
    it('short-circuits on empty contexts without reading character', async () => {
      const result = await service.addManaFromCompletions('user-1', 'task', [])

      expectManaGrant(result, {})
      expect(mockRepo.findWithClasses).not.toHaveBeenCalled()
    })

    it('returns failure shape when character missing', async () => {
      mockRepo.findWithClasses.mockResolvedValue(null)

      const result = await service.addManaFromCompletions('user-1', 'task', [{ impact: 'LOW' }])

      expectManaGrant(result, { success: false })
    })

    it('aggregates mixed-impact tasks in a single character read and single health write', async () => {
      mockRepo.findWithClasses.mockResolvedValue(buildCharacter({ mana: 0, maxMana: 100, classId: BigInt(10), id: BigInt(1) }))

      const result = await service.addManaFromCompletions('user-1', 'task', [
        { impact: 'HIGH' },
        { impact: 'MEDIUM' },
        { impact: 'LOW' }
      ])

      const expected = MANA_REWARDS.TASK_HIGH_IMPACT + MANA_REWARDS.TASK_MID_IMPACT + MANA_REWARDS.TASK_LOW_IMPACT
      expectManaGrant(result, { amount: expected, manaApplied: expected, newMana: expected })
      expect(mockRepo.findWithClasses).toHaveBeenCalledTimes(1)
      expect(mockRepo.updateHealth).toHaveBeenCalledTimes(1)
    })
  })

  describe('topUpFromReserve', () => {
    it('returns zero shape when character missing', async () => {
      mockRepo.findByIdWithClasses.mockResolvedValue(null)

      const result = await service.topUpFromReserve(BigInt(1))

      expect(result).toEqual({ added: 0, newMana: 0, newReserve: 0 })
      expect(mockRepo.updateHealth).not.toHaveBeenCalled()
    })

    it('preserves reserve when currentClass missing', async () => {
      const character = buildCharacter({ reserve: 7 })
      character.currentClass = CharacterClassName.HERALD
      mockRepo.findByIdWithClasses.mockResolvedValue(character)

      const result = await service.topUpFromReserve(BigInt(1))

      expect(result).toEqual({ added: 0, newMana: 0, newReserve: 7 })
    })

    it('no-ops without writing when reserve is empty', async () => {
      mockRepo.findByIdWithClasses.mockResolvedValue(buildCharacter({ mana: 4, maxMana: 10, reserve: 0 }))

      const result = await service.topUpFromReserve(BigInt(1))

      expect(result).toEqual({ added: 0, newMana: 4, newReserve: 0 })
      expect(mockRepo.updateHealth).not.toHaveBeenCalled()
      expect(mockRepo.updateManaReserve).not.toHaveBeenCalled()
    })

    it('no-ops without writing when mana already full', async () => {
      mockRepo.findByIdWithClasses.mockResolvedValue(buildCharacter({ mana: 10, maxMana: 10, reserve: 5 }))

      const result = await service.topUpFromReserve(BigInt(1))

      expect(result).toEqual({ added: 0, newMana: 10, newReserve: 5 })
      expect(mockRepo.updateHealth).not.toHaveBeenCalled()
    })

    it('drains reserve into mana when room exceeds reserve', async () => {
      mockRepo.findByIdWithClasses.mockResolvedValue(
        buildCharacter({ mana: 5, maxMana: 10, reserve: 3, classId: BigInt(10), id: BigInt(1) })
      )

      const result = await service.topUpFromReserve(BigInt(1))

      expect(result).toEqual({ added: 3, newMana: 8, newReserve: 0 })
      expect(mockRepo.updateHealth).toHaveBeenCalledWith(BigInt(10), 100, 8)
      expect(mockRepo.updateManaReserve).toHaveBeenCalledWith(BigInt(1), 0)
    })

    it('caps drain at remaining room when reserve exceeds room', async () => {
      mockRepo.findByIdWithClasses.mockResolvedValue(
        buildCharacter({ mana: 7, maxMana: 10, reserve: 20, classId: BigInt(10), id: BigInt(1) })
      )

      const result = await service.topUpFromReserve(BigInt(1))

      expect(result).toEqual({ added: 3, newMana: 10, newReserve: 17 })
      expect(mockRepo.updateManaReserve).toHaveBeenCalledWith(BigInt(1), 17)
    })
  })

  describe('getTodayReserveBreakdown', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-05-26T15:30:00Z'))
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    it('sums per-source mana with correct counts and total', async () => {
      ;(prisma.habitCompletion.count as ReturnType<typeof vi.fn>).mockResolvedValue(3)
      ;(prisma.task.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { impact: 'HIGH' },
        { impact: 'MEDIUM' },
        { impact: null }
      ])
      ;(prisma.objective.count as ReturnType<typeof vi.fn>).mockResolvedValue(2)
      ;(prisma.journalEntry.count as ReturnType<typeof vi.fn>).mockResolvedValue(4)

      const result = await service.getTodayReserveBreakdown('user-1')

      const taskMana = MANA_REWARDS.TASK_HIGH_IMPACT + MANA_REWARDS.TASK_MID_IMPACT + MANA_REWARDS.TASK_LOW_IMPACT
      expect(result).toEqual({
        habits: { count: 3, mana: 3 * MANA_REWARDS.HABIT },
        tasks: { count: 3, mana: taskMana },
        objectives: { count: 2, mana: 2 * MANA_REWARDS.OBJECTIVE },
        journals: { count: 4, mana: 4 * MANA_REWARDS.JOURNAL },
        total: 3 * MANA_REWARDS.HABIT + taskMana + 2 * MANA_REWARDS.OBJECTIVE + 4 * MANA_REWARDS.JOURNAL
      })
    })

    it('uses UTC-midnight window when timezoneOffset is 0', async () => {
      ;(prisma.habitCompletion.count as ReturnType<typeof vi.fn>).mockResolvedValue(0)
      ;(prisma.task.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
      ;(prisma.objective.count as ReturnType<typeof vi.fn>).mockResolvedValue(0)
      ;(prisma.journalEntry.count as ReturnType<typeof vi.fn>).mockResolvedValue(0)

      await service.getTodayReserveBreakdown('user-1')

      const habitArgs = (prisma.habitCompletion.count as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(habitArgs.where.completedAt.gte).toEqual(new Date('2026-05-26T00:00:00Z'))
      expect(habitArgs.where.completedAt.lt).toEqual(new Date('2026-05-27T00:00:00Z'))
    })

    it('shifts window by timezoneOffset minutes', async () => {
      ;(prisma.habitCompletion.count as ReturnType<typeof vi.fn>).mockResolvedValue(0)
      ;(prisma.task.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
      ;(prisma.objective.count as ReturnType<typeof vi.fn>).mockResolvedValue(0)
      ;(prisma.journalEntry.count as ReturnType<typeof vi.fn>).mockResolvedValue(0)

      await service.getTodayReserveBreakdown('user-1', 480)

      const habitArgs = (prisma.habitCompletion.count as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(habitArgs.where.completedAt.gte).toEqual(new Date('2026-05-26T08:00:00Z'))
      expect(habitArgs.where.completedAt.lt).toEqual(new Date('2026-05-27T08:00:00Z'))
    })

    it('reads journalEntry by createdAt, not completedAt', async () => {
      ;(prisma.habitCompletion.count as ReturnType<typeof vi.fn>).mockResolvedValue(0)
      ;(prisma.task.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
      ;(prisma.objective.count as ReturnType<typeof vi.fn>).mockResolvedValue(0)
      ;(prisma.journalEntry.count as ReturnType<typeof vi.fn>).mockResolvedValue(0)

      await service.getTodayReserveBreakdown('user-1')

      const journalArgs = (prisma.journalEntry.count as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(journalArgs.where).toHaveProperty('createdAt')
      expect(journalArgs.where).not.toHaveProperty('completedAt')
    })
  })

  describe('scrubManaPotions', () => {
    it('returns zero shape when character missing', async () => {
      mockRepo.findWithClasses.mockResolvedValue(null)

      const result = await service.scrubManaPotions('user-1')

      expect(result).toEqual({ removed: 0, goldRefunded: 0 })
      expect(mockRepo.updateInventoryAndLoadout).not.toHaveBeenCalled()
    })

    it('is idempotent when scrubbed flag already set', async () => {
      mockRepo.findWithClasses.mockResolvedValue(
        buildCharacter({ data: { scrubbedManaPotions: true }, inventory: [{ definitionId: 'mana_potion' }] })
      )

      const result = await service.scrubManaPotions('user-1')

      expect(result).toEqual({ removed: 0, goldRefunded: 0 })
      expect(mockRepo.updateInventoryAndLoadout).not.toHaveBeenCalled()
      expect(mockRepo.updateCharacterData).not.toHaveBeenCalled()
    })

    it('removes potions from inventory and loadout, refunds gold, sets flag', async () => {
      mockRepo.findWithClasses.mockResolvedValue(
        buildCharacter({
          id: BigInt(1),
          inventory: [{ definitionId: 'mana_potion' }, { definitionId: 'sword' }, { definitionId: 'mana_potion' }],
          loadout: [{ definitionId: 'mana_potion' }, { definitionId: 'shield' }]
        })
      )

      const result = await service.scrubManaPotions('user-1')

      expect(result).toEqual({ removed: 3, goldRefunded: 75 })
      expect(mockRepo.updateInventoryAndLoadout).toHaveBeenCalledWith(
        BigInt(1),
        [{ definitionId: 'sword' }],
        [{ definitionId: 'shield' }]
      )
      expect(mockRepo.addGold).toHaveBeenCalledWith(BigInt(1), 75)
      expect(mockRepo.updateCharacterData).toHaveBeenCalledWith(
        BigInt(1),
        expect.objectContaining({ scrubbedManaPotions: true })
      )
    })

    it('skips inventory write and gold refund when no potions found, still sets flag', async () => {
      mockRepo.findWithClasses.mockResolvedValue(
        buildCharacter({ id: BigInt(1), inventory: [{ definitionId: 'sword' }], loadout: [] })
      )

      const result = await service.scrubManaPotions('user-1')

      expect(result).toEqual({ removed: 0, goldRefunded: 0 })
      expect(mockRepo.updateInventoryAndLoadout).not.toHaveBeenCalled()
      expect(mockRepo.addGold).not.toHaveBeenCalled()
      expect(mockRepo.updateCharacterData).toHaveBeenCalled()
    })
  })

  describe('calculateStreakFromDates', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-05-26T12:00:00Z'))
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    const day = (iso: string) => new Date(`${iso}T12:00:00Z`)

    it('returns 0 for empty list', () => {
      expect(service.calculateStreakFromDates([])).toBe(0)
    })

    it('counts a single completion today as streak of 1', () => {
      expect(service.calculateStreakFromDates([day('2026-05-26')])).toBe(1)
    })

    it('counts consecutive days ending today', () => {
      expect(service.calculateStreakFromDates([day('2026-05-24'), day('2026-05-25'), day('2026-05-26')])).toBe(3)
    })

    it('counts consecutive days ending yesterday (1-day grace)', () => {
      expect(service.calculateStreakFromDates([day('2026-05-24'), day('2026-05-25')])).toBe(2)
    })

    it('returns 0 when most recent completion is older than 1 day', () => {
      expect(service.calculateStreakFromDates([day('2026-05-23'), day('2026-05-24')])).toBe(0)
    })

    it('breaks on gap, ignoring older runs', () => {
      expect(
        service.calculateStreakFromDates([day('2026-05-20'), day('2026-05-21'), day('2026-05-25'), day('2026-05-26')])
      ).toBe(2)
    })

    it('deduplicates same-day completions', () => {
      expect(service.calculateStreakFromDates([day('2026-05-26'), day('2026-05-26'), day('2026-05-25')])).toBe(2)
    })

    it('calculateHabitStreak proxies through completedAt', () => {
      const result = service.calculateHabitStreak([
        { completedAt: day('2026-05-25') },
        { completedAt: day('2026-05-26') }
      ])
      expect(result).toBe(2)
    })
  })
})
