import { EnemyType } from '@shared/constants/enemies.constants'

// Translation key prefixes for procedural enemy names by type
const NAME_PREFIXES: Record<EnemyType, string[]> = {
  [EnemyType.MINION]: [
    'enemyNames.minion.prefix.0',
    'enemyNames.minion.prefix.1',
    'enemyNames.minion.prefix.2',
    'enemyNames.minion.prefix.3',
    'enemyNames.minion.prefix.4',
    'enemyNames.minion.prefix.5',
    'enemyNames.minion.prefix.6',
    'enemyNames.minion.prefix.7',
    'enemyNames.minion.prefix.8',
    'enemyNames.minion.prefix.9',
    'enemyNames.minion.prefix.10',
    'enemyNames.minion.prefix.11'
  ],
  [EnemyType.ELITE]: [
    'enemyNames.elite.prefix.0',
    'enemyNames.elite.prefix.1',
    'enemyNames.elite.prefix.2',
    'enemyNames.elite.prefix.3',
    'enemyNames.elite.prefix.4',
    'enemyNames.elite.prefix.5',
    'enemyNames.elite.prefix.6',
    'enemyNames.elite.prefix.7',
    'enemyNames.elite.prefix.8',
    'enemyNames.elite.prefix.9',
    'enemyNames.elite.prefix.10',
    'enemyNames.elite.prefix.11'
  ],
  [EnemyType.BOSS]: [
    'enemyNames.boss.prefix.0',
    'enemyNames.boss.prefix.1',
    'enemyNames.boss.prefix.2',
    'enemyNames.boss.prefix.3',
    'enemyNames.boss.prefix.4',
    'enemyNames.boss.prefix.5',
    'enemyNames.boss.prefix.6',
    'enemyNames.boss.prefix.7',
    'enemyNames.boss.prefix.8',
    'enemyNames.boss.prefix.9',
    'enemyNames.boss.prefix.10',
    'enemyNames.boss.prefix.11'
  ]
}

const NAME_SUFFIXES: Record<EnemyType, string[]> = {
  [EnemyType.MINION]: [
    'enemyNames.minion.suffix.0',
    'enemyNames.minion.suffix.1',
    'enemyNames.minion.suffix.2',
    'enemyNames.minion.suffix.3',
    'enemyNames.minion.suffix.4',
    'enemyNames.minion.suffix.5',
    'enemyNames.minion.suffix.6',
    'enemyNames.minion.suffix.7',
    'enemyNames.minion.suffix.8',
    'enemyNames.minion.suffix.9',
    'enemyNames.minion.suffix.10',
    'enemyNames.minion.suffix.11'
  ],
  [EnemyType.ELITE]: [
    'enemyNames.elite.suffix.0',
    'enemyNames.elite.suffix.1',
    'enemyNames.elite.suffix.2',
    'enemyNames.elite.suffix.3',
    'enemyNames.elite.suffix.4',
    'enemyNames.elite.suffix.5',
    'enemyNames.elite.suffix.6',
    'enemyNames.elite.suffix.7',
    'enemyNames.elite.suffix.8',
    'enemyNames.elite.suffix.9',
    'enemyNames.elite.suffix.10',
    'enemyNames.elite.suffix.11'
  ],
  [EnemyType.BOSS]: [
    'enemyNames.boss.suffix.0',
    'enemyNames.boss.suffix.1',
    'enemyNames.boss.suffix.2',
    'enemyNames.boss.suffix.3',
    'enemyNames.boss.suffix.4',
    'enemyNames.boss.suffix.5',
    'enemyNames.boss.suffix.6',
    'enemyNames.boss.suffix.7',
    'enemyNames.boss.suffix.8',
    'enemyNames.boss.suffix.9',
    'enemyNames.boss.suffix.10',
    'enemyNames.boss.suffix.11'
  ]
}

/**
 * Generate translation keys for a procedural enemy name
 * @param enemyType The type of enemy (MINION, ELITE, BOSS)
 * @returns Object with prefix and suffix translation keys
 */
export function generateEnemyNameKeys(enemyType: EnemyType): { prefix: string; suffix: string } {
  const prefixes = NAME_PREFIXES[enemyType]
  const suffixes = NAME_SUFFIXES[enemyType]

  const prefixIndex = Math.floor(Math.random() * prefixes.length)
  const suffixIndex = Math.floor(Math.random() * suffixes.length)

  return {
    prefix: prefixes[prefixIndex],
    suffix: suffixes[suffixIndex]
  }
}
