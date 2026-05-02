import type { ActiveStatusEffect } from './doctrine.types'
import type { CombatLogEntry } from './gamification.types'

// Combat unit representing player or enemy (no grid position)
export interface CombatUnit {
  id: string
  name: string
  isPlayer: boolean

  // Stats
  currentHealth: number
  maxHealth: number

  // Turn state
  hasMoved: boolean
  hasActed: boolean

  // Active doctrine buffs (for self-buff doctrines)
  activeDoctrines?: Record<string, ActiveStatusEffect>
  // Active status effects (burning, stunned, etc.)
  activeEffects?: ActiveStatusEffect[]
}

// Combat phases for the new Pokemon-style system
export const CombatPhase = {
  PLAYER_INPUT: 'player_input',
  ANIMATING: 'animating',
  ENEMY_TURN: 'enemy_turn',
  VICTORY: 'victory',
  DEFEAT: 'defeat'
} as const
export type CombatPhase = (typeof CombatPhase)[keyof typeof CombatPhase]

// Version 2 of tactical state — no grid, no tiles, no positions
export const COMBAT_STATE_VERSION = 2

// Combat state stored in database (JSON field)
export interface CombatStateData {
  stateVersion: number // Must match COMBAT_STATE_VERSION
  playerUnit: CombatUnit
  enemyUnits: CombatUnit[]
  turnOrder: string[] // Unit IDs in turn order
  currentTurnIndex: number
  turnNumber: number
  potionUsedThisTurn: boolean
}

// Attack result from server
export interface CombatAttackResult {
  success: boolean
  attackerId: string
  targetId: string
  damageDealt: number
  targetKilled: boolean
  damageToAttacker: number
  attackerKilled: boolean
  updatedState: CombatStateData
  attackerRolls: { value: number; isSuccess: boolean; isCritical: boolean }[]
  defenderRolls: { value: number; isSuccess: boolean; isCritical: boolean }[]
  logEntries: CombatLogEntry[]
  goldReward?: number
  nextEnemy?: {
    id: string
    templateId: string
    name: string
    currentHealth: number
    maxHealth: number
  }
  selfDamageFromOnes?: number
  tierProgression?: { oldTier: number; newTier: number }
}

// Enemy turn result from server
export interface CombatEnemyTurnResult {
  success: boolean
  enemyId: string
  action: 'attack' | 'wait'

  // Attack data (if attacked)
  attacked: boolean
  targetId?: string
  damageDealt?: number
  targetKilled?: boolean
  attackerRolls?: { value: number; isSuccess: boolean; isCritical: boolean }[]
  defenderRolls?: { value: number; isSuccess: boolean; isCritical: boolean }[]

  // Updated state
  updatedState: CombatStateData

  // Combat log entries
  logEntries?: CombatLogEntry[]

  // Mana regenerated at end of round
  manaRegenerated?: number

  // Status effect damage taken at start of turn
  statusEffectDamage?: number
  // Whether enemy died from status effect damage
  diedFromStatusEffect?: boolean
}

// Doctrine result from server
export interface CombatDoctrineResult {
  success: boolean
  casterId: string
  doctrineId: string
  targeting: 'single' | 'all'
  affectedUnitIds: string[]
  effects: {
    unitId: string
    damageDealt?: number
    healthRestored?: number
    statusApplied?: string
    killed?: boolean
    bonusDice?: number
  }[]
  manaCost: number
  updatedState: CombatStateData
  logEntries: CombatLogEntry[]
  manaRestored?: number
  selfDamage?: number
  goldReward?: number
  nextEnemy?: {
    id: string
    templateId: string
    name: string
    currentHealth: number
    maxHealth: number
  }
  tierProgression?: { oldTier: number; newTier: number }
}
