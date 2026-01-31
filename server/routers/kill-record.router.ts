import { z } from 'zod'
import { protectedProcedure, t } from '../trpc'

export const killRecordRouter = t.router({
  getKillRecord: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).optional(),
          cursor: z.string().uuid().optional()
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      return ctx.services.killRecord.getKillRecord(ctx.user.id, input?.limit, input?.cursor)
    }),

  getKillStats: protectedProcedure.query(async ({ ctx }) => {
    return ctx.services.killRecord.getKillStats(ctx.user.id)
  })
})
