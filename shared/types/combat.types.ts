import type { ResolvedEncounterSlot } from '@shared/constants/encounter-patterns'
import type { CombatTurnResult, EnemyState } from './gamification.types'

export interface AttackResult extends CombatTurnResult {
  updatedEnemyState: EnemyState[]
  allEnemiesDefeated: boolean
  newDiceBank: number
  characterDead: boolean
}

export interface EncounterState {
  encounterPattern: ResolvedEncounterSlot[]
  encounterIndex: number
  sessionStartedAt: string
}
