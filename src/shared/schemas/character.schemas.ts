import { CharacterClassName, MagicNature } from '@shared/constants/classes.constants'
import { slotTypeValues } from '@shared/types/gamification.types'
import { z } from 'zod'

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

export const useConsumableSchema = z.object({
  consumableId: z.string().min(1)
})
export type UseConsumableType = z.infer<typeof useConsumableSchema>

export const equipAbilitySchema = z.object({
  abilityId: z.string().min(1)
})
export type EquipAbilityType = z.infer<typeof equipAbilitySchema>

export const unequipAbilitySchema = z.object({
  abilityId: z.string().min(1)
})
export type UnequipAbilityType = z.infer<typeof unequipAbilitySchema>

export const updateCharacterNameSchema = z.object({
  name: z.string().trim().min(1).max(255)
})
export type UpdateCharacterNameType = z.infer<typeof updateCharacterNameSchema>
