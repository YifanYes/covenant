import { PrismaClient } from '../generated/prisma/client'
import { getCharacterProgress } from './character.services'

export const addDiceToBank = async (prisma: PrismaClient, userId: string, amount: number) => {
  const character = await prisma.character.findUnique({
    where: { userId },
    include: { classes: true }
  })

  if (!character) return { success: false, earned: 0 }

  const { maxDice: maxCapacity, diceBank: currentDice } = getCharacterProgress(character)
  const rawCharacterData = (character.data as any) || {}
  const newDice = Math.min(currentDice + amount, maxCapacity)
  const earned = newDice - currentDice

  await prisma.character.update({
    where: { id: character.id },
    data: {
      data: {
        ...rawCharacterData,
        diceBank: newDice
      }
    }
  })

  return {
    success: true,
    earned,
    total: newDice,
    limitReached: newDice === maxCapacity && earned < amount
  }
}

export const calculateHabitStreak = (completions: { completedAt: Date }[]): number => {
  if (completions.length === 0) return 0

  // Sort completions by date descending
  const sorted = [...completions].sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())

  let streak = 0
  let currentDate = new Date()
  currentDate.setHours(0, 0, 0, 0)

  // Check if completed today or yesterday to continue streak
  const lastCompletionDate = new Date(sorted[0].completedAt)
  lastCompletionDate.setHours(0, 0, 0, 0)

  const diffDays = Math.floor((currentDate.getTime() - lastCompletionDate.getTime()) / (1000 * 60 * 60 * 24))

  // If last completion was more than 1 day ago, streak is broken
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
      // Same day completion, ignore
      continue
    } else {
      break
    }
  }

  return streak
}
