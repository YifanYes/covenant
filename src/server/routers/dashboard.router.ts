import { z } from 'zod'
import { protectedProcedure, t } from '../trpc'

export const dashboardRouter = t.router({
  get: protectedProcedure
    .input(z.object({ timezoneOffset: z.number().int().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.services.dashboard.getDashboardData(ctx.user.id, input?.timezoneOffset)
    })
})
