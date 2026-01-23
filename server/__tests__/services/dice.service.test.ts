import { getMaxDiceForTier } from '@shared/constants/dice.constants'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DiceService } from '../../services/dice.service'
import { mockCharacter } from '../fixtures/character.fixtures'
import { createMockPrisma } from '../mocks/prisma.mock'

// Mock dependencies
const mockPrisma = createMockPrisma()

vi.mock('../../repositories/character.repository', () => ({
  CharacterRepository: vi.fn(function () {
    return {
      findWithClasses: vi.fn(),
      updateCharacterData: vi.fn()
    }
  })
}))

describe('DiceService', () => {
  let diceService: DiceService
  let mockCharacterRepo: any

  beforeEach(() => {
    vi.clearAllMocks()
    diceService = new DiceService(mockPrisma as any)
    mockCharacterRepo = (diceService as any).characterRepository
  })

  describe('addDiceToBank', () => {
    it('should add dice and return earned amount', async () => {
      const character = mockCharacter({
        data: { diceBank: 0 }
      })
      // Tier 1 max dice is 20 usually
      mockCharacterRepo.findWithClasses.mockResolvedValue(character)

      const result = await diceService.addDiceToBank('user-1', 5)

      expect(result.success).toBe(true)
      expect(result.earned).toBe(5)
      expect(result.total).toBe(5)
      expect(mockCharacterRepo.updateCharacterData).toHaveBeenCalled()
    })

    it('should cap dice at max limit', async () => {
      const character = mockCharacter({
        data: { diceBank: 18 }
      })
      // Assuming Tier 1 max is 20
      const maxDice = getMaxDiceForTier(1)

      mockCharacterRepo.findWithClasses.mockResolvedValue(character)

      // Try adding 5, should only add 2 to reach 20
      const result = await diceService.addDiceToBank('user-1', 5)

      expect(result.earned).toBe(maxDice - 18)
      expect(result.total).toBe(maxDice)
      expect(result.limitReached).toBe(true)
    })
  })

  describe('calculateHabitStreak', () => {
    it('should identify a streak of 3 days', () => {
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(today.getDate() - 1)
      const dayBefore = new Date(today)
      dayBefore.setDate(today.getDate() - 2)

      const completions = [{ completedAt: today }, { completedAt: yesterday }, { completedAt: dayBefore }]

      expect(diceService.calculateHabitStreak(completions)).toBe(3)
    })

    it('should return 0 if not completed today or yesterday', () => {
      const threeDaysAgo = new Date()
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

      const completions = [{ completedAt: threeDaysAgo }]
      expect(diceService.calculateHabitStreak(completions)).toBe(0)
    })

    it('should handle multiple completions on same day', () => {
      const today = new Date()

      const completions = [
        { completedAt: today },
        { completedAt: today } // Duplicate day shouldn't break streak logic
      ]

      // Depending on implementation, it might count as 1
      expect(diceService.calculateHabitStreak(completions)).toBe(1)
    })
  })
})
