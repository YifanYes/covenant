import { z } from 'zod'

export const createJournalEntrySchema = z.object({
  content: z.string().min(1, 'errors.required_field').max(10000),
  mood: z.string().max(20).optional(),
  color: z.string().max(7).optional(),
  timezoneOffset: z.number().int().optional().default(0)
})
export type CreateJournalEntryType = z.infer<typeof createJournalEntrySchema>

export const updateJournalEntrySchema = z.object({
  id: z.uuid(),
  content: z.string().min(1, 'errors.required_field').max(10000).optional(),
  mood: z.string().max(20).optional(),
  color: z.string().max(7).optional()
})
export type UpdateJournalEntryType = z.infer<typeof updateJournalEntrySchema>

export const journalEntryIdSchema = z.object({
  id: z.uuid()
})

export const journalDateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timezoneOffset: z.number().int().optional().default(0)
})

export const journalListSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(7)
})

export const journalMonthSchema = z.object({
  month: z.number().int().min(0).max(11),
  year: z.number().int().min(2000).max(2100),
  timezoneOffset: z.number().int().optional().default(0)
})

export const journalStreakSchema = z.object({
  timezoneOffset: z.number().int().optional().default(0)
})
