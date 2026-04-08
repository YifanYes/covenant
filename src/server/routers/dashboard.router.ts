import { protectedProcedure, t } from '../trpc'

export const dashboardRouter = t.router({
  get: protectedProcedure.query(async ({ ctx }) => {
    return ctx.services.dashboard.getDashboardData(ctx.user.id)
  })
})
