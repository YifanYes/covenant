import { z } from 'zod'

export const clientLogSchema = z.object({
  level: z.enum(['error', 'warn', 'info']),
  message: z.string().max(1000),
  context: z.unknown().optional(),
  timestamp: z.string().datetime(),
  source: z.literal('client')
})

export type ClientLogType = z.infer<typeof clientLogSchema>
