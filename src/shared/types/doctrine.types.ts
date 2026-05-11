import type { CharacterClassName, MagicNature } from '../constants/classes'

export const DoctrineEffectType = {
  POWER_MODIFIER: 'POWER_MODIFIER',
  THRESHOLD_MODIFIER: 'THRESHOLD_MODIFIER',
  GUARANTEED_CRITICAL: 'GUARANTEED_CRITICAL',
  NEGATE_HITS: 'NEGATE_HITS',
  APPLY_STATUS: 'APPLY_STATUS',
  HEAL: 'HEAL',
  DIRECT_DAMAGE: 'DIRECT_DAMAGE'
} as const
export type DoctrineEffectType = (typeof DoctrineEffectType)[keyof typeof DoctrineEffectType]

export type MoveDamageType = 'PHYSICAL' | 'MAGIC'

export const StatusEffect = {
  // Target loses their next action phase
  STUNNED: 'STUNNED',
  // Target's speed is reduced to 0
  IMMOBILIZED: 'IMMOBILIZED',
  // Target takes 1 damage at start of turn (demons immune)
  BURNING: 'BURNING',
  // Target takes 1 holy damage at start of turn (affects demons)
  PURIFIED: 'PURIFIED',
  // Target takes 2 damage at start of turn
  POISONED: 'POISONED',
  // Target has reduced attack or defense dice
  WEAKENED: 'WEAKENED',
  // Placeholder for active doctrines with immediate effects
  DOCTRINE_ACTIVE: 'DOCTRINE_ACTIVE'
} as const
export type StatusEffect = (typeof StatusEffect)[keyof typeof StatusEffect]

/** Canonical list of negative/debuff statuses that can be cleansed */
export const NEGATIVE_STATUSES: StatusEffect[] = [
  StatusEffect.BURNING,
  StatusEffect.STUNNED,
  StatusEffect.IMMOBILIZED,
  StatusEffect.POISONED,
  StatusEffect.PURIFIED,
  StatusEffect.WEAKENED
]

export const DoctrineAttributeType = {
  LIGHT: 'LIGHT',
  FIRE: 'FIRE',
  METAL: 'METAL',
  WATER: 'WATER',
  EARTH: 'EARTH',
  AIR: 'AIR',
  LIGHTNING: 'LIGHTNING',
  DARKNESS: 'DARKNESS',
  ICE: 'ICE',
  MIND: 'MIND'
} as const
export type DoctrineAttributeType = (typeof DoctrineAttributeType)[keyof typeof DoctrineAttributeType]

export const DoctrineTarget = {
  SELF: 'SELF',
  ENEMY: 'ENEMY',
  ALL_ENEMIES: 'ALL_ENEMIES'
} as const
export type DoctrineTarget = (typeof DoctrineTarget)[keyof typeof DoctrineTarget]

export interface DoctrineEffect {
  type: DoctrineEffectType
  target: DoctrineTarget
  // Value for the effect (e.g., dice bonus, heal amount, damage)
  value?: number
  // Duration in turns for status effects
  duration?: number
  // Which status effect to apply (for APPLY_STATUS type)
  statusEffect?: StatusEffect
  // Execute threshold: kills target if currentHealth < maxHealth * healthThreshold (0.25 = 25%)
  healthThreshold?: number
  // If true, the effect value scales with enemy tier (tier * 2 dice)
  scalesWithEnemyTier?: boolean
  // Thorns damage: flat damage dealt to attackers when the buff holder is hit (karmic_retribution)
  thornsDamage?: number
  // Duration of BURNING applied to attacker by thorns (retaliation)
  thornsBurnDuration?: number
  // Whether this debuff reduces 'attack' or 'defense' dice (for WEAKENED status)
  debuffType?: 'attack' | 'defense'
  // Extra hits generated per 6 rolled (stellar_collapse)
  sixesGenerateExtraHits?: number
}

export interface DoctrineDefinition {
  id: string
  nameKey: string
  descriptionKey: string
  flavorTextKey: string
  className: CharacterClassName | 'universal'
  magicNature: MagicNature | 'universal'
  attribute: DoctrineAttributeType
  tier: number
  manaCost: number
  isUltimate: boolean
  effects: DoctrineEffect[]
  // Pokemon-style targeting: 'single' (1 enemy) or 'all' (all enemies, 0.6x damage)
  // Omitted for pure self-buff doctrines
  targeting?: 'single' | 'all'
  // Pokémon-style damage move: routes through Gen-1 formula in combat-formula.ts
  // Side-effect-only moves omit these and route through tactical-doctrine.ts
  power?: number
  damageType?: MoveDamageType
  // Recoil damage as percent of damage dealt (reckless_strike: 25 = 25%)
  recoilPercent?: number
}

/**
 * Represents an active status effect on a combat unit.
 * NOTE: This type serves double duty — it stores both simple statuses (BURNING, STUNNED)
 * and doctrine-specific metadata (pending enemy status, WEAKENED params). Consider splitting
 * into discriminated union types if more variants are added.
 */
export interface ActiveStatusEffect {
  effect: StatusEffect
  remainingTurns: number
  sourceDoctrineId: string
  // For mixed SELF+ENEMY doctrines: enemy status to apply on next attack hit
  pendingEnemyStatus?: StatusEffect
  pendingEnemyStatusDuration?: number
  // For WEAKENED status: whether it reduces attack or defense, and by how much
  debuffType?: 'attack' | 'defense'
  debuffValue?: number
}

export interface CombatDoctrineState {
  equippedDoctrines: string[]
  activeEffects: Record<string, ActiveStatusEffect>
  doctrinesUsedThisTurn: string[]
}

export interface EnemyStatusState {
  enemyId: string
  activeEffects: Record<string, ActiveStatusEffect>
}
