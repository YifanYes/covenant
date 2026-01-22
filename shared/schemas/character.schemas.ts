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

export const useConsumableSchema = z.object({
  consumableId: z.string().min(1)
})
export type UseConsumableType = z.infer<typeof useConsumableSchema>

export const equipDoctrineSchema = z.object({
  doctrineId: z.string().min(1)
})
export type EquipDoctrineType = z.infer<typeof equipDoctrineSchema>

export const unequipDoctrineSchema = z.object({
  doctrineId: z.string().min(1)
})
export type UnequipDoctrineType = z.infer<typeof unequipDoctrineSchema>

export const useDoctrineSchema = z.object({
  doctrineId: z.string().min(1),
  participationId: z.string().min(1)
})
export type UseDoctrineType = z.infer<typeof useDoctrineSchema>
