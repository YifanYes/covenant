import { z } from 'zod'
import { CharacterClassName, MagicNature } from '../constants/classes'
import { slotTypeValues } from '../types/gamification.types'

export const createCharacterSchema = z.object({
  name: z.string().min(1).max(255),
  className: z.enum(CharacterClassName),
  magicNature: z.enum(MagicNature)
})
export type CreateCharacterType = z.infer<typeof createCharacterSchema>

export const switchClassSchema = z.object({
  className: z.enum(CharacterClassName)
})

export type SwitchClassType = z.infer<typeof switchClassSchema>

export const equipItemSchema = z.object({
  itemId: z.string().min(1)
})
export type EquipItemType = z.infer<typeof equipItemSchema>

export const unequipItemSchema = z.object({
  slotType: z.enum(slotTypeValues)
})
export type UnequipItemType = z.infer<typeof unequipItemSchema>
