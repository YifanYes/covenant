import type { CharacterClassName, MagicNature } from '../constants/classes'

export const AbilityEffectType = {
  POWER_MODIFIER: 'POWER_MODIFIER',
  THRESHOLD_MODIFIER: 'THRESHOLD_MODIFIER',
  GUARANTEED_CRITICAL: 'GUARANTEED_CRITICAL',
  NEGATE_HITS: 'NEGATE_HITS',
  APPLY_STATUS: 'APPLY_STATUS',
  HEAL: 'HEAL',
  DIRECT_DAMAGE: 'DIRECT_DAMAGE'
} as const
export type AbilityEffectType = (typeof AbilityEffectType)[keyof typeof AbilityEffectType]

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
  // Target has reduced attack or defense stat
  WEAKENED: 'WEAKENED',
  // Placeholder for active abilities with immediate effects
  ABILITY_ACTIVE: 'ABILITY_ACTIVE'
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

export const AbilityAttributeType = {
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
export type AbilityAttributeType = (typeof AbilityAttributeType)[keyof typeof AbilityAttributeType]

export const AbilityTarget = {
  SELF: 'SELF',
  ENEMY: 'ENEMY',
  ALL_ENEMIES: 'ALL_ENEMIES'
} as const
export type AbilityTarget = (typeof AbilityTarget)[keyof typeof AbilityTarget]

export interface AbilityEffect {
  type: AbilityEffectType
  target: AbilityTarget
  // Value for the effect (e.g., % stat modifier, heal amount, damage)
  value?: number
  // Duration in turns for status effects
  duration?: number
  // Which status effect to apply (for APPLY_STATUS type)
  statusEffect?: StatusEffect
  // Execute threshold: kills target if currentHealth < maxHealth * healthThreshold (0.25 = 25%)
  healthThreshold?: number
  // If true, the effect value scales with enemy tier (POWER_MODIFIER: base% × enemy tier)
  scalesWithEnemyTier?: boolean
  // Thorns damage: flat damage dealt to attackers when the buff holder is hit (karmic_retribution)
  thornsDamage?: number
  // Duration of BURNING applied to attacker by thorns (retaliation)
  thornsBurnDuration?: number
  // Whether this debuff reduces 'attack' or 'defense' stat (for WEAKENED status)
  debuffType?: 'attack' | 'defense'
}

export interface AbilityDefinition {
  id: string
  nameKey: string
  descriptionKey: string
  flavorTextKey: string
  className: CharacterClassName | 'universal'
  magicNature: MagicNature | 'universal'
  attribute: AbilityAttributeType
  tier: number
  manaCost: number
  isUltimate: boolean
  effects: AbilityEffect[]
  // Pokemon-style targeting: 'single' (1 enemy) or 'all' (all enemies, 0.6x damage)
  // Omitted for pure self-buff abilities
  targeting?: 'single' | 'all'
  // Pokémon-style damage move: routes through Gen-1 formula in combat-formula.ts
  power?: number
  damageType?: MoveDamageType
  // Recoil damage as percent of damage dealt (reckless_strike: 25 = 25%)
  recoilPercent?: number
}

/**
 * Represents an active status effect on a combat unit.
 * NOTE: This type serves double duty — it stores both simple statuses (BURNING, STUNNED)
 * and ability-specific metadata (pending enemy status, WEAKENED params). Consider splitting
 * into discriminated union types if more variants are added.
 */
export interface ActiveStatusEffect {
  effect: StatusEffect
  remainingTurns: number
  sourceAbilityId: string
  // For mixed SELF+ENEMY abilities: enemy status to apply on next attack hit
  pendingEnemyStatus?: StatusEffect
  pendingEnemyStatusDuration?: number
  // For WEAKENED status: whether it reduces attack or defense, and by how much
  debuffType?: 'attack' | 'defense'
  debuffValue?: number
}

export interface CombatAbilityState {
  equippedAbilities: string[]
  activeEffects: Record<string, ActiveStatusEffect>
  abilitiesUsedThisTurn: string[]
}

export interface EnemyStatusState {
  enemyId: string
  activeEffects: Record<string, ActiveStatusEffect>
}
