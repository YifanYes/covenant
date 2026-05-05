import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DiceService } from '../../services/dice.service'
import { mockCharacter } from '../fixtures/character.fixtures'

describe('DiceService', () => {
  let diceService: DiceService
  let mockCharacterRepo: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockCharacterRepo = {
      findWithClasses: vi.fn(),
      updateCharacterData: vi.fn()
    }

    diceService = new DiceService(mockCharacterRepo)
  })

  describe('addDiceToBank', () => {
    it('should add dice and return earned amount', async () => {
      const character = mockCharacter({
        data: { diceBank: 0 }
      })
      mockCharacterRepo.findWithClasses.mockResolvedValue(character)

      const result = await diceService.addDiceToBank('user-1', 5)

      expect(result.success).toBe(true)
      expect(result.earned).toBe(5)
      expect(result.total).toBe(5)
      expect(mockCharacterRepo.updateCharacterData).toHaveBeenCalledWith(character.id, { diceBank: 5 })
    })

    it('should accumulate dice beyond any tier threshold', async () => {
      const character = mockCharacter({
        data: { diceBank: 100 }
      })
      mockCharacterRepo.findWithClasses.mockResolvedValue(character)

      const result = await diceService.addDiceToBank('user-1', 50)

      expect(result.success).toBe(true)
      expect(result.earned).toBe(50)
      expect(result.total).toBe(150)
    })

    it('should return failure if character not found', async () => {
      mockCharacterRepo.findWithClasses.mockResolvedValue(null)

      const result = await diceService.addDiceToBank('nonexistent', 5)

      expect(result.success).toBe(false)
      expect(result.earned).toBe(0)
    })
  })

  describe('consumeDiceFromBank', () => {
    it('should consume dice and return consumed amount', async () => {
      const character = mockCharacter({
        data: { diceBank: 10 }
      })
      mockCharacterRepo.findWithClasses.mockResolvedValue(character)

      const result = await diceService.consumeDiceFromBank('user-1', 5)

      expect(result.success).toBe(true)
      expect(result.consumed).toBe(5)
      expect(result.remaining).toBe(5)
      expect(mockCharacterRepo.updateCharacterData).toHaveBeenCalledWith(character.id, { diceBank: 5 })
    })

    it('should only consume available dice if requesting more than available', async () => {
      const character = mockCharacter({
        data: { diceBank: 3 }
      })
      mockCharacterRepo.findWithClasses.mockResolvedValue(character)

      const result = await diceService.consumeDiceFromBank('user-1', 10)

      expect(result.success).toBe(true)
      expect(result.consumed).toBe(3)
      expect(result.remaining).toBe(0)
      expect(mockCharacterRepo.updateCharacterData).toHaveBeenCalledWith(character.id, { diceBank: 0 })
    })

    it('should return failure if character not found', async () => {
      mockCharacterRepo.findWithClasses.mockResolvedValue(null)

      const result = await diceService.consumeDiceFromBank('nonexistent', 5)

      expect(result.success).toBe(false)
      expect(result.consumed).toBe(0)
      expect(result.remaining).toBe(0)
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
        { completedAt: today }
      ]

      expect(diceService.calculateHabitStreak(completions)).toBe(1)
    })
  })
})
