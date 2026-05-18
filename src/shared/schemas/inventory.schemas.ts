import { ItemRarity, ItemType } from '@shared/types/gamification.types'
import { z } from 'zod'

export const itemTypeSchema = z.enum(ItemType)

export const itemRaritySchema = z.enum(ItemRarity)

export const inventoryItemSchema = z.object({
  id: z.string(),
  definitionId: z.string().optional(),
  nameKey: z.string(),
  descriptionKey: z.string().optional(),
  type: itemTypeSchema,
  tier: z.number(),
  rarity: itemRaritySchema,
  stats: z.record(z.string(), z.number().optional()),
  obtainedAt: z.coerce.date()
})
export type InventoryItemType = z.infer<typeof inventoryItemSchema>

export const inventoryListSchema = z.array(inventoryItemSchema)
export type InventoryListType = z.infer<typeof inventoryListSchema>

export const characterDataSchema = z
  .object({
    scrubbedManaPotions: z.boolean().optional()
  })
  .catchall(z.unknown())
export type CharacterDataType = z.infer<typeof characterDataSchema>
