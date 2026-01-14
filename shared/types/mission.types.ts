import type { MissionTemplate } from '../constants/missions'
import type { EnemyState } from './gamification.types'

export interface MissionType {
  id: string
  partyId: string
  name: string
  description: string | null
  status: string
  requiredTier: number
  enemyState: unknown
  rewards: unknown
  combatLog: unknown
  createdAt: Date
  updatedAt: Date
  completedAt: Date | null
  failedAt?: Date | null
}

export interface MissionListResult {
  missions: MissionTemplate[]
  characterTier: number
}

export interface StartMissionResult {
  mission: MissionType
  template: MissionTemplate
}

export interface CompleteMissionResult {
  success: boolean
  newTier: number
  rewards: any
}

export interface AdvancePhaseResult {
  phaseAdvanced: boolean
  missionComplete: boolean
  newPhase?: number
  newEnemyState?: EnemyState[]
}
