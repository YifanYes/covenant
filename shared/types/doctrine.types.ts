import type { CharacterClassName, MagicNature } from '../constants/classes'

export const DoctrineEffectType = {
  // Adds extra power dice to attack or defense
  POWER_MODIFIER: 'POWER_MODIFIER',
  // Modifies the threshold for success (e.g., 3+ instead of 4+)
  THRESHOLD_MODIFIER: 'THRESHOLD_MODIFIER',
  // Guarantees a critical hit (natural 6)
  GUARANTEED_CRITICAL: 'GUARANTEED_CRITICAL',
  // Negates a fixed number of hits received
  NEGATE_HITS: 'NEGATE_HITS',
  // Applies a status effect to target
  APPLY_STATUS: 'APPLY_STATUS',
  // Heals health or mana
  HEAL: 'HEAL',
  // Deals direct damage ignoring defense
  DIRECT_DAMAGE: 'DIRECT_DAMAGE'
} as const
export type DoctrineEffectType = (typeof DoctrineEffectType)[keyof typeof DoctrineEffectType]

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
  // Placeholder for active doctrines with immediate effects
  DOCTRINE_ACTIVE: 'DOCTRINE_ACTIVE'
} as const
export type StatusEffect = (typeof StatusEffect)[keyof typeof StatusEffect]

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
}

export interface DoctrineDefinition {
  id: string
  nameKey: string
  descriptionKey: string
  flavorTextKey: string
  className: CharacterClassName
  magicNature: MagicNature
  tier: number
  manaCost: number
  isUltimate: boolean
  effects: DoctrineEffect[]
}

export interface ActiveStatusEffect {
  effect: StatusEffect
  remainingTurns: number
  sourceDoctrineId: string
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
