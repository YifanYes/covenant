export const MORALITY_THRESHOLDS = {
  SAINT: 75,
  DEMON: 25,
  MIN: 0,
  MAX: 100,
  DEFAULT: 50
} as const

export const MoralityStatus = {
  SAINT: 'SAINT',
  NEUTRAL: 'NEUTRAL',
  DEMON: 'DEMON'
} as const
export type MoralityStatus = (typeof MoralityStatus)[keyof typeof MoralityStatus]

export function getMoralityStatus(morality: number): MoralityStatus {
  if (morality >= MORALITY_THRESHOLDS.SAINT) return MoralityStatus.SAINT
  if (morality <= MORALITY_THRESHOLDS.DEMON) return MoralityStatus.DEMON
  return MoralityStatus.NEUTRAL
}

export function clampMorality(value: number): number {
  return Math.max(MORALITY_THRESHOLDS.MIN, Math.min(MORALITY_THRESHOLDS.MAX, value))
}
