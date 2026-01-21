import type { EnemyTemplate } from '../constants/enemies'
import type { WeaponDamageType } from '../constants/items'

export const ItemType = {
  WEAPON_MELEE: 'WEAPON_MELEE',
  WEAPON_RANGED: 'WEAPON_RANGED',
  WEAPON_MAGIC: 'WEAPON_MAGIC',
  ARMOR: 'ARMOR',
  ACCESSORY: 'ACCESSORY'
} as const
export type ItemType = (typeof ItemType)[keyof typeof ItemType]

export const ItemRarity = {
  COMMON: 'COMMON',
  RARE: 'RARE',
  LEGENDARY: 'LEGENDARY'
} as const
export type ItemRarity = (typeof ItemRarity)[keyof typeof ItemRarity]

// Slot types for equipment
export const SlotType = {
  WEAPON: 'WEAPON',
  ARMOR: 'ARMOR',
  ACCESSORY: 'ACCESSORY'
} as const
export type SlotType = (typeof SlotType)[keyof typeof SlotType]
export const slotTypeValues = ['WEAPON', 'ARMOR', 'ACCESSORY'] as const

export interface InventoryItem {
  id: string
  definitionId?: string // Link to base item definition not unique id
  name: string
  description?: string
  type: ItemType
  tier: number
  rarity: ItemRarity
  stats: Record<string, number | undefined>
  obtainedAt: Date
}

// Enemy types (for display)
export type EnemyType = 'MINION' | 'ELITE' | 'BOSS'

export interface Enemy {
  id: string
  name: string
  tier: number
  type: EnemyType
  health: number
  currentHealth: number
  damage: number
}

// Enemy state for tracking during combat
export interface EnemyState {
  id: string
  enemyId: string
  currentHealth: number
  maxHealth: number
}

// Combat log types
export const CombatLogType = {
  PLAYER_ATTACK: 'PLAYER_ATTACK',
  PLAYER_HITS: 'PLAYER_HITS',
  ENEMY_DEFENDS: 'ENEMY_DEFENDS',
  ENEMY_ATTACKS: 'ENEMY_ATTACKS',
  PLAYER_DEFENDS: 'PLAYER_DEFENDS',
  DAMAGE_TO_ENEMY: 'DAMAGE_TO_ENEMY',
  DAMAGE_TO_PLAYER: 'DAMAGE_TO_PLAYER',
  MANA_REGEN: 'MANA_REGEN',
  ENEMY_DEFEATED: 'ENEMY_DEFEATED',
  PHASE_COMPLETE: 'PHASE_COMPLETE'
} as const
export type CombatLogType = (typeof CombatLogType)[keyof typeof CombatLogType]

export interface CombatLogEntry {
  timestamp: number
  type: CombatLogType
  data: Record<string, unknown>
}

export const ActivityStatus = {
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED'
} as const
export type ActivityStatus = (typeof ActivityStatus)[keyof typeof ActivityStatus]

// Combat types
export interface DiceRollResult {
  value: number
  isSuccess: boolean
  isCritical: boolean
}

// Parameters for resolving a combat turn
export interface ResolveCombatParams {
  attackRolls: number[]
  defenseRolls: number[]
  targetEnemyId: string
  playerStrengthAtk: number
  playerStrengthDef: number
  playerMagicAtk: number
  playerMagicDef: number
  playerManaRegen: number
  weaponDamageType: WeaponDamageType
  enemy: EnemyTemplate
  tier: number
}

export interface CombatTurnResult {
  playerAttackRolls: DiceRollResult[]
  enemyDefenseRolls: DiceRollResult[]
  enemyAttackRolls: DiceRollResult[]
  playerDefenseRolls: DiceRollResult[]
  playerHits: number
  enemyBlocks: number
  enemyHits: number
  playerBlocks: number
  damageToEnemy: number
  damageToPlayer: number
  manaRegenerated: number
  targetEnemyId: string
  logEntries: CombatLogEntry[]
}

// Character class info for inventory view
export interface InventoryCharacterClass {
  id: string
  className: string
  tier: number

  health: number
  mana: number
  maxHealth: number
  maxMana: number
  strengthAtk: number
  strengthDef: number
  magicAtk: number
  magicDef: number
  manaRegen: number
}

// Character data returned by getCurrentClass endpoint
export interface InventoryCharacter {
  id: string
  name: string
  title: string | null
  orderName: string | null
  magicNature: string | null
  currentClass: string
  data: Record<string, unknown>
  gold: number
  maxDice: number
  tier: number
  inventory: InventoryItem[]
  loadout: InventoryItem[]
  classes: InventoryCharacterClass[]
}
