import type { InventoryItemType } from '@shared/schemas/inventory.schemas'

export type InventoryItem = InventoryItemType

export const ItemType = {
  WEAPON_MELEE: 'WEAPON_MELEE',
  WEAPON_RANGED: 'WEAPON_RANGED',
  WEAPON_MAGIC: 'WEAPON_MAGIC',
  ARMOR: 'ARMOR',
  ACCESSORY: 'ACCESSORY',
  CONSUMABLE: 'CONSUMABLE'
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

export const EquipmentTypeFilter = {
  ALL: 'all',
  WEAPON: 'weapon',
  ARMOR: 'armor',
  ACCESSORY: 'accessory',
  CONSUMABLE: 'consumable'
} as const
export type EquipmentTypeFilter = (typeof EquipmentTypeFilter)[keyof typeof EquipmentTypeFilter]

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
  templateId: string
  currentHealth: number
  maxHealth: number
  currentMana: number
  maxMana: number
  namePrefix?: string
  nameSuffix?: string
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
  PLAYER_DEFEATED: 'PLAYER_DEFEATED',
  PHASE_COMPLETE: 'PHASE_COMPLETE',
  STATUS_EFFECT: 'STATUS_EFFECT',
  ABILITY_EFFECT: 'ABILITY_EFFECT',
  STATUS_EXPIRED: 'STATUS_EXPIRED'
} as const
export type CombatLogType = (typeof CombatLogType)[keyof typeof CombatLogType]

export interface CombatLogEntry {
  timestamp: number
  type: CombatLogType
  data: Record<string, unknown>
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
  speed: number
  equippedAbilities: string[]
}

// Character data returned by getCurrentClass endpoint
export interface InventoryCharacter {
  id: string
  name: string
  title: string | null
  factionName: string
  magicNature: string | null
  currentClass: string
  data: Record<string, unknown>
  gold: number
  manaReserve: number
  tier: number
  inventory: InventoryItem[]
  loadout: InventoryItem[]
  classes: InventoryCharacterClass[]
}

export const CombatEnemyStatus = {
  ACTIVE: 'ACTIVE',
  DEFEATED: 'DEFEATED'
} as const
export type CombatEnemyStatus = (typeof CombatEnemyStatus)[keyof typeof CombatEnemyStatus]
