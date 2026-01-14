import type { CombatTurnResult, EnemyState } from './gamification.types'

export interface AttackResult extends CombatTurnResult {
  updatedEnemyState: EnemyState[]
  allEnemiesDefeated: boolean
  newDiceBank: number
  characterDead: boolean
}
