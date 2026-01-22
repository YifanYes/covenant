import { EnemyType } from './enemies'

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
    'enemyNames.minion.prefix.7'
  ],
  [EnemyType.ELITE]: [
    'enemyNames.elite.prefix.0',
    'enemyNames.elite.prefix.1',
    'enemyNames.elite.prefix.2',
    'enemyNames.elite.prefix.3',
    'enemyNames.elite.prefix.4',
    'enemyNames.elite.prefix.5'
  ],
  [EnemyType.BOSS]: [
    'enemyNames.boss.prefix.0',
    'enemyNames.boss.prefix.1',
    'enemyNames.boss.prefix.2',
    'enemyNames.boss.prefix.3',
    'enemyNames.boss.prefix.4'
  ]
}

const NAME_SUFFIXES: Record<EnemyType, string[]> = {
  [EnemyType.MINION]: [
    'enemyNames.minion.suffix.0',
    'enemyNames.minion.suffix.1',
    'enemyNames.minion.suffix.2',
    'enemyNames.minion.suffix.3',
    'enemyNames.minion.suffix.4',
    'enemyNames.minion.suffix.5'
  ],
  [EnemyType.ELITE]: [
    'enemyNames.elite.suffix.0',
    'enemyNames.elite.suffix.1',
    'enemyNames.elite.suffix.2',
    'enemyNames.elite.suffix.3',
    'enemyNames.elite.suffix.4'
  ],
  [EnemyType.BOSS]: [
    'enemyNames.boss.suffix.0',
    'enemyNames.boss.suffix.1',
    'enemyNames.boss.suffix.2',
    'enemyNames.boss.suffix.3',
    'enemyNames.boss.suffix.4'
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
