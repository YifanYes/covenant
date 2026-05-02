import type { DiceAddResult } from '@shared/types/dice.types'
import type { CharacterRepository } from '../repositories/character.repository'
import { getCharacterProgress } from '../utils/character.utils'

export class DiceService {
  constructor(private characterRepository: CharacterRepository) {}

  async addDiceToBank(userId: string, amount: number): Promise<DiceAddResult> {
    const character = await this.characterRepository.findWithClasses(userId)

    if (!character) return { success: false, earned: 0 }

    const { maxDice: maxCapacity, diceBank: currentDice } = getCharacterProgress(character)
    const rawCharacterData = (character.data as any) || {}
    const newDice = Math.min(currentDice + amount, maxCapacity)
    const earned = newDice - currentDice

    const newData = {
      ...rawCharacterData,
      diceBank: newDice
    }

    await this.characterRepository.updateCharacterData(character.id, newData)

    return {
      success: true,
      earned,
      total: newDice,
      limitReached: newDice === maxCapacity && earned < amount
    }
  }

  async consumeDiceFromBank(userId: string, amount: number): Promise<{ success: boolean; consumed: number; remaining: number }> {
    const character = await this.characterRepository.findWithClasses(userId)

    if (!character) return { success: false, consumed: 0, remaining: 0 }

    const { diceBank: currentDice } = getCharacterProgress(character)
    const rawCharacterData = (character.data as any) || {}

    // Can only consume up to what's available
    const consumed = Math.min(amount, currentDice)
    const newDice = currentDice - consumed

    const newData = {
      ...rawCharacterData,
      diceBank: newDice
    }

    await this.characterRepository.updateCharacterData(character.id, newData)

    return {
      success: true,
      consumed,
      remaining: newDice
    }
  }

  calculateHabitStreak(completions: { completedAt: Date }[]): number {
    if (completions.length === 0) return 0

    const sorted = [...completions].sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())

    let streak = 0
    const currentDate = new Date()
    currentDate.setHours(0, 0, 0, 0)

    const lastCompletionDate = new Date(sorted[0].completedAt)
    lastCompletionDate.setHours(0, 0, 0, 0)

    const diffDays = Math.floor((currentDate.getTime() - lastCompletionDate.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays > 1) return 0

    streak = 1
    let lastDate = lastCompletionDate

    for (let i = 1; i < sorted.length; i++) {
      const nextDate = new Date(sorted[i].completedAt)
      nextDate.setHours(0, 0, 0, 0)

      const dayDiff = Math.floor((lastDate.getTime() - nextDate.getTime()) / (1000 * 60 * 60 * 24))

      if (dayDiff === 1) {
        streak++
        lastDate = nextDate
      } else if (dayDiff === 0) {
        continue
      } else {
        break
      }
    }

    return streak
  }
}
