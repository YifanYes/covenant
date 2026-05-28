import { TAVERN_MESSAGE_MAX_LENGTH } from '@shared/constants/tavern.constants'
import { z } from 'zod'
import { publicIdSchema } from './ids.schemas'

export const tavernMessageCursorSchema = z.object({
  createdAt: z.iso.datetime(),
  publicId: publicIdSchema
})
export type TavernMessageCursorType = z.infer<typeof tavernMessageCursorSchema>

export const getTavernMessagesSchema = z.object({
  cursor: tavernMessageCursorSchema.optional(),
  limit: z.number().int().min(1).max(100).optional()
})
export type GetTavernMessagesType = z.infer<typeof getTavernMessagesSchema>

export const sendTavernMessageSchema = z.object({
  content: z.string().trim().min(1).max(TAVERN_MESSAGE_MAX_LENGTH)
})
export type SendTavernMessageType = z.infer<typeof sendTavernMessageSchema>

export const tavernMessageIdSchema = z.object({
  publicId: publicIdSchema
})
export type TavernMessageIdType = z.infer<typeof tavernMessageIdSchema>

export const deleteTavernMessageSchema = z.object({
  publicId: publicIdSchema
})
export type DeleteTavernMessageType = z.infer<typeof deleteTavernMessageSchema>
