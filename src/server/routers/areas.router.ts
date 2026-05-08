import { createAreaSchema, deleteAreaSchema, updateAreaSchema } from '@shared/schemas/areas.schemas'
import { protectedProcedure, rateLimit, RATE_LIMITS, t } from '../trpc'

export const areasRouter = t.router({
  create: protectedProcedure.use(rateLimit(RATE_LIMITS.write)).input(createAreaSchema).mutation(async ({ ctx, input }) => {
    return ctx.services.area.create(ctx.user.id, input)
  }),

  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.services.area.getAll(ctx.user.id)
  }),

  update: protectedProcedure.use(rateLimit(RATE_LIMITS.write)).input(updateAreaSchema).mutation(async ({ ctx, input }) => {
    return ctx.services.area.update(ctx.user.id, input)
  }),

  delete: protectedProcedure.use(rateLimit(RATE_LIMITS.strict)).input(deleteAreaSchema).mutation(async ({ ctx, input }) => {
    return ctx.services.area.delete(ctx.user.id, input.id)
  })
})
