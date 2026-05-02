// Enemy types
export const EnemyType = {
  MINION: 'MINION',
  ELITE: 'ELITE',
  BOSS: 'BOSS',
  SPECIAL: 'SPECIAL'
} as const
export type EnemyType = (typeof EnemyType)[keyof typeof EnemyType]
