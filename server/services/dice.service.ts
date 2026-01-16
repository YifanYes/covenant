import { getMaxDiceForTier } from '@shared/constants/dice.constants'
import type { CharacterWithClasses } from '@shared/types/character.types'
import type { DiceAddResult } from '@shared/types/dice.types'
import type { PrismaClient } from '../generated/prisma'
import { CharacterRepository } from '../repositories/character.repository'

export class DiceService {
  private characterRepository: CharacterRepository

  constructor(prisma: PrismaClient) {
    this.characterRepository = new CharacterRepository(prisma)
  }

  async addDiceToBank(userId: string, amount: number): Promise<DiceAddResult> {
    const character = await this.characterRepository.findWithClasses(userId)

    if (!character) return { success: false, earned: 0 }

    const { maxDice: maxCapacity, diceBank: currentDice } = this.getCharacterProgress(character)
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

  calculateHabitStreak(completions: { completedAt: Date }[]): number {
    if (completions.length === 0) return 0

    const sorted = [...completions].sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())

    let streak = 0
    let currentDate = new Date()
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

  private getCharacterProgress(character: CharacterWithClasses) {
    const currentClass = character.classes.find((c) => c.className === character.currentClass)
    const tier = currentClass?.tier || 1
    const maxDice = getMaxDiceForTier(tier)
    const diceBank = (character.data as any)?.diceBank || 0

    return { tier, maxDice, diceBank }
  }
}
