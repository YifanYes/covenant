import { z } from 'zod'
import { CharacterClassName } from '../constants/classes'

export const createCharacterSchema = z.object({
  name: z.string().min(1).max(255),
  className: z.enum(CharacterClassName)
})
export type CreateCharacterType = z.infer<typeof createCharacterSchema>

export const switchClassSchema = z.object({
  className: z.enum(CharacterClassName)
})

export type SwitchClassType = z.infer<typeof switchClassSchema>
