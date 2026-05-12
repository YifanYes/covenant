/**
 * Mana grants from real-life completions (Phase 2A).
 * Replaces DICE_REWARDS. Surplus above `CharacterClass.maxMana` overflows into `Character.manaReserve`.
 */
export const MANA_REWARDS = {
  HABIT: 2,
  TASK_LOW_IMPACT: 1,
  TASK_MID_IMPACT: 3,
  TASK_HIGH_IMPACT: 5,
  OBJECTIVE: 10,
  JOURNAL: 1
} as const

export const HABIT_STREAK_BONUSES = [
  { days: 21, bonus: 3 },
  { days: 14, bonus: 2 },
  { days: 7, bonus: 1 }
] as const

export type ManaSource = 'task' | 'habit' | 'objective' | 'journal'

export type TaskImpact = 'LOW' | 'MEDIUM' | 'HIGH'

export function getTaskMana(impact: TaskImpact | string | null | undefined): number {
  if (impact === 'HIGH') return MANA_REWARDS.TASK_HIGH_IMPACT
  if (impact === 'MEDIUM') return MANA_REWARDS.TASK_MID_IMPACT
  return MANA_REWARDS.TASK_LOW_IMPACT
}
