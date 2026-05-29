import {
  createJournalEntrySchema,
  journalDateSchema,
  journalEntryIdSchema,
  journalListSchema,
  journalMonthSchema,
  journalStreakSchema,
  updateJournalEntrySchema
} from '@shared/schemas/journal.schemas'
import { protectedProcedure, rateLimit, RATE_LIMITS, t } from '../trpc'

export const journalingRouter = t.router({
  create: protectedProcedure.use(rateLimit(RATE_LIMITS.write)).input(createJournalEntrySchema).mutation(async ({ ctx, input }) => {
    return ctx.services.journal.create(ctx.user.id, input)
  }),

  update: protectedProcedure.use(rateLimit(RATE_LIMITS.write)).input(updateJournalEntrySchema).mutation(async ({ ctx, input }) => {
    return ctx.services.journal.update(ctx.user.id, input)
  }),

  delete: protectedProcedure.use(rateLimit(RATE_LIMITS.strict)).input(journalEntryIdSchema).mutation(async ({ ctx, input }) => {
    return ctx.services.journal.delete(ctx.user.id, input.publicId)
  }),

  getById: protectedProcedure.input(journalEntryIdSchema).query(async ({ ctx, input }) => {
    return ctx.services.journal.getById(ctx.user.id, input.publicId)
  }),

  getByDate: protectedProcedure.input(journalDateSchema).query(async ({ ctx, input }) => {
    return ctx.services.journal.getByDate(ctx.user.id, input.date, input.timezoneOffset)
  }),

  getAll: protectedProcedure.input(journalListSchema).query(async ({ ctx, input }) => {
    return ctx.services.journal.getAll(ctx.user.id, input)
  }),

  getMoodCalendar: protectedProcedure.input(journalMonthSchema).query(async ({ ctx, input }) => {
    return ctx.services.journal.getMoodCalendar(ctx.user.id, input.month, input.year, input.timezoneOffset)
  }),

  getStreak: protectedProcedure.input(journalStreakSchema).query(async ({ ctx, input }) => {
    return ctx.services.journal.getStreak(ctx.user.id, input.timezoneOffset)
  })
})
