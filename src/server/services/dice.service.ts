import type { DiceAddResult } from '@shared/types/dice.types'
import type { CharacterRepository } from '../repositories/character.repository'
import { getCharacterProgress } from '../utils/character.utils'

export class DiceService {
  constructor(private characterRepository: CharacterRepository) {}

  async addDiceToBank(userId: string, amount: number): Promise<DiceAddResult> {
    const character = await this.characterRepository.findWithClasses(userId)

    if (!character) return { success: false, earned: 0 }

    const { diceBank: currentDice } = getCharacterProgress(character)
    const newDice = currentDice + amount

    await this.characterRepository.updateCharacterData(character.id, { diceBank: newDice })

    return {
      success: true,
      earned: amount,
      total: newDice
    }
  }

  async consumeDiceFromBank(
    userId: string,
    amount: number
  ): Promise<{ success: boolean; consumed: number; remaining: number }> {
    const character = await this.characterRepository.findWithClasses(userId)

    if (!character) return { success: false, consumed: 0, remaining: 0 }

    const { diceBank: currentDice } = getCharacterProgress(character)

    // Can only consume up to what's available
    const consumed = Math.min(amount, currentDice)
    const newDice = currentDice - consumed

    await this.characterRepository.updateCharacterData(character.id, { diceBank: newDice })

    return {
      success: true,
      consumed,
      remaining: newDice
    }
  }

  calculateHabitStreak(completions: { completedAt: Date }[]): number {
    return this.calculateStreakFromDates(completions.map((c) => c.completedAt))
  }

  calculateStreakFromDates(dates: Date[], timezoneOffset = 0): number {
    if (dates.length === 0) return 0

    const toLocalDay = (d: Date) => {
      const localTs = d.getTime() - timezoneOffset * 60 * 1000
      const localDate = new Date(localTs)
      return Date.UTC(localDate.getUTCFullYear(), localDate.getUTCMonth(), localDate.getUTCDate())
    }

    const sorted = [...dates].map(toLocalDay).sort((a, b) => b - a)

    const currentDate = toLocalDay(new Date())

    const diffDays = Math.floor((currentDate - sorted[0]) / (1000 * 60 * 60 * 24))

    if (diffDays > 1) return 0

    let streak = 1
    let prevDate = sorted[0]

    for (let i = 1; i < sorted.length; i++) {
      const dayDiff = Math.floor((prevDate - sorted[i]) / (1000 * 60 * 60 * 24))

      if (dayDiff === 1) {
        streak++
        prevDate = sorted[i]
      } else if (dayDiff === 0) {
        continue
      } else {
        break
      }
    }

    return streak
  }
}
