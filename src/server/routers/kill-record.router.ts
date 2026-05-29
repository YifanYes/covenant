import { publicIdSchema } from '@shared/schemas/ids.schemas'
import { z } from 'zod'
import { protectedProcedure, t } from '../trpc'

export const killRecordRouter = t.router({
  getKillRecord: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).optional(),
          cursor: publicIdSchema.optional()
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      return ctx.services.killRecord.getKillRecord(ctx.user.id, input?.limit, input?.cursor)
    }),

  getKillStats: protectedProcedure.query(async ({ ctx }) => {
    return ctx.services.killRecord.getKillStats(ctx.user.id)
  }),

  getTierProgress: protectedProcedure.query(async ({ ctx }) => {
    return ctx.services.killRecord.getTierProgressInfo(ctx.user.id)
  })
})
