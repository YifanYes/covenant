import { z } from 'zod'

export const tavernMessageCursorSchema = z.object({
  createdAt: z.string().datetime(),
  id: z.string().uuid()
})
export type TavernMessageCursorType = z.infer<typeof tavernMessageCursorSchema>

export const getTavernMessagesSchema = z.object({
  cursor: tavernMessageCursorSchema.optional(),
  limit: z.number().int().min(1).max(100).optional()
})
export type GetTavernMessagesType = z.infer<typeof getTavernMessagesSchema>

export const sendTavernMessageSchema = z.object({
  content: z.string().trim().min(1).max(500)
})
export type SendTavernMessageType = z.infer<typeof sendTavernMessageSchema>

export const tavernMessageIdSchema = z.object({
  messageId: z.string().uuid()
})
export type TavernMessageIdType = z.infer<typeof tavernMessageIdSchema>

export const deleteTavernMessageSchema = z.object({
  id: z.string().uuid()
})
export type DeleteTavernMessageType = z.infer<typeof deleteTavernMessageSchema>
