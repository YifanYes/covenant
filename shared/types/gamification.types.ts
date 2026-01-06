import { z } from 'zod'

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
  name: string
  description?: string
  type: ItemType
  tier: number
  rarity: ItemRarity
  stats: Record<string, any>
  obtainedAt: Date
}

export const characterDataSchema = z.object({
  diceBank: z.number().default(0),
  lastDiceReset: z.string().optional(),
  habitStreaks: z.record(z.string(), z.number()).optional(),
  downedUntil: z.string().optional()
})
