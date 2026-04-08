export const DICE_REWARDS = {
  HABIT_BASE: 2,
  TASK_LOW_IMPACT: 2,
  TASK_HIGH_IMPACT: 4,
  OBJECTIVE: 6,
  DAILY_LOGIN_BASE: 2
} as const

export const DICE_BANK_LIMITS: Record<number, number> = {
  1: 10,
  2: 15,
  3: 20,
  4: 25,
  5: 30,
  6: 35,
  7: 40,
  8: 45,
  9: 50,
  10: 55
}

export const HABIT_STREAK_THRESHOLDS = [
  { days: 21, bonus: 3 },
  { days: 14, bonus: 2 },
  { days: 7, bonus: 1 }
] as const

export const getMaxDiceForTier = (tier: number): number => {
  return DICE_BANK_LIMITS[tier] || DICE_BANK_LIMITS[1]
}
