export const DICE_REWARDS = {
  HABIT_BASE: 2,
  TASK_LOW_IMPACT: 2,
  TASK_HIGH_IMPACT: 4,
  OBJECTIVE: 6,
  DAILY_LOGIN_BASE: 2
} as const

export const HABIT_STREAK_THRESHOLDS = [
  { days: 21, bonus: 3 },
  { days: 14, bonus: 2 },
  { days: 7, bonus: 1 }
] as const

