import { z } from 'zod'
import type { ItemStats } from '../constants/items'

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
