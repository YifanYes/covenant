export const DICE_REWARDS = {
  HABIT_BASE: 2,
  TASK_LOW_IMPACT: 2,
  TASK_HIGH_IMPACT: 4,
  OBJECTIVE: 6,
  DAILY_LOGIN_BASE: 2
} as const

export const DICE_BANK_LIMITS = {
  TIER_1: 10,
  TIER_2: 15,
  TIER_3: 20
} as const

export const DICE_PER_TURN_LIMITS = {
  TIER_1: 5,
  TIER_2: 6,
  TIER_3: 7
} as const

export const HABIT_STREAK_THRESHOLDS = [
  { days: 21, bonus: 3 },
  { days: 14, bonus: 2 },
  { days: 7, bonus: 1 }
] as const

export const getTierFromLevel = (level: number): number => {
  if (level >= 20) return 3
  if (level >= 10) return 2
  return 1
}

export const getMaxDiceForTier = (tier: number): number => {
  if (tier >= 3) return DICE_BANK_LIMITS.TIER_3
  if (tier >= 2) return DICE_BANK_LIMITS.TIER_2
  return DICE_BANK_LIMITS.TIER_1
}
