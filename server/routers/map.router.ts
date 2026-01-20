import { protectedProcedure, t } from '../trpc'

export const mapRouter = t.router({
  getState: protectedProcedure.query(async ({ ctx }) => {
    return ctx.services.map.getMapState()
  })
})
