import { z } from 'zod'
import type { EnemyTemplate } from '../constants/enemies'
import type { ItemStats, WeaponDamageType } from '../constants/items'
import type { MissionTemplate } from '../constants/missions'

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

export interface InventoryItem {
  id: string
  definitionId: string
  name: string
  description?: string
  type: ItemType
  tier: number
  rarity: ItemRarity
  stats: ItemStats
  obtainedAt: Date
}

export const characterDataSchema = z.object({
  diceBank: z.number().default(0),
  lastDiceReset: z.string().optional(),
  habitStreaks: z.record(z.string(), z.number()).optional(),
  downedUntil: z.string().optional()
})

export enum MissionStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export const SlotType = {
  WEAPON: 'WEAPON',
  ARMOR: 'ARMOR',
  ACCESSORY: 'ACCESSORY'
} as const
export type SlotType = (typeof SlotType)[keyof typeof SlotType]
export const slotTypeValues = Object.values(SlotType) as [string, ...string[]]

export interface CharacterClassProgress {
  id: string
  className: string
  tier: number
  missionProgress: Record<string, number>
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

export interface InventoryCharacter {
  id: string
  name: string | null
  title: string | null
  currentClass: string | null
  magicNature: string | null
  tier: number
  orderName: string | null
  gold: number
  maxDice: number | null
  data: any
  inventory: InventoryItem[] | any[] | null
  loadout: InventoryItem[] | any[] | null
  classes: CharacterClassProgress[]
}

export const AVAILABLE_TIERS = [1, 2, 3] as const

export interface DiceRollResult {
  value: number
  isSuccess: boolean
  isCritical: boolean
}

export interface EnemyState {
  id: string
  enemyId: string
  currentHealth: number
  maxHealth: number
}

export enum CombatLogType {
  PLAYER_ATTACK = 'player_attack',
  PLAYER_HITS = 'player_hits',
  ENEMY_DEFENDS = 'enemy_defends',
  ENEMY_ATTACKS = 'enemy_attacks',
  PLAYER_DEFENDS = 'player_defends',
  DAMAGE_TO_ENEMY = 'damage_to_enemy',
  DAMAGE_TO_PLAYER = 'damage_to_player',
  ENEMY_DEFEATED = 'enemy_defeated',
  MANA_REGEN = 'mana_regen',
  PHASE_COMPLETE = 'phase_complete'
}

export interface CombatLogEntry {
  timestamp: number
  type: CombatLogType
  data: Record<string, string | number | number[]>
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

export interface ResolveCombatParams {
  diceCount: number
  targetEnemyId: string
  playerStrengthAtk: number
  playerStrengthDef: number
  playerMagicAtk: number
  playerMagicDef: number
  playerArmorDice: number
  playerManaRegen: number
  weaponDamageType: WeaponDamageType
  enemy: EnemyTemplate
  tier: number
}

export type ActiveMissionData = {
  mission: {
    id: string
    name: string
    currentPhase: number
    enemyState: unknown
    combatLog: unknown
  } | null
  template: MissionTemplate | undefined
} | null
