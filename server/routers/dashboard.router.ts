import { getDashboardData } from '../services/dashboard.services'
import { protectedProcedure, t } from '../trpc'

export const dashboardRouter = t.router({
  get: protectedProcedure.query(async ({ ctx }) => {
    return getDashboardData(ctx.prisma, ctx.user.id)
  })
})
