import { z } from 'zod'
import { publicIdSchema } from './ids.schemas'

export const createJournalEntrySchema = z.object({
  content: z.string().min(1, 'errors.required_field').max(10000),
  mood: z.string().max(20).optional(),
  color: z.string().max(7).optional(),
  // Local calendar date (YYYY-MM-DD) the entry is for. Omitted = today.
  // z.iso.date() validates format AND real calendar date (rejects 2020-13-45, 2020-02-30).
  date: z.iso.date().optional(),
  timezoneOffset: z.number().int().optional().default(0)
})
export type CreateJournalEntryType = z.infer<typeof createJournalEntrySchema>

export const updateJournalEntrySchema = z.object({
  publicId: publicIdSchema,
  content: z.string().min(1, 'errors.required_field').max(10000).optional(),
  mood: z.string().max(20).optional(),
  color: z.string().max(7).optional()
})
export type UpdateJournalEntryType = z.infer<typeof updateJournalEntrySchema>

export const journalEntryIdSchema = z.object({
  publicId: publicIdSchema
})

export const journalDateSchema = z.object({
  date: z.iso.date(),
  timezoneOffset: z.number().int().optional().default(0)
})

export const journalListSchema = z.object({
  // Cursor = 1-based page number. Optional so the tRPC infinite-query helper can inject it.
  cursor: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(100).default(8)
})

export const journalMonthSchema = z.object({
  month: z.number().int().min(0).max(11),
  year: z.number().int().min(2000).max(2100),
  timezoneOffset: z.number().int().optional().default(0)
})

export const journalStreakSchema = z.object({
  timezoneOffset: z.number().int().optional().default(0)
})
