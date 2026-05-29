import {
  completeObjectiveSchema,
  createObjectiveSchema,
  deleteObjectiveSchema,
  updateObjectiveSchema
} from '@shared/schemas/objectives.schemas'
import { protectedProcedure, rateLimit, RATE_LIMITS, t } from '../trpc'

export const objectivesRouter = t.router({
  create: protectedProcedure.use(rateLimit(RATE_LIMITS.write)).input(createObjectiveSchema).mutation(async ({ ctx, input }) => {
    return ctx.services.objective.create(ctx.user.id, input)
  }),

  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.services.objective.getAll(ctx.user.id)
  }),

  update: protectedProcedure.use(rateLimit(RATE_LIMITS.write)).input(updateObjectiveSchema).mutation(async ({ ctx, input }) => {
    return ctx.services.objective.update(ctx.user.id, input)
  }),

  complete: protectedProcedure.use(rateLimit(RATE_LIMITS.write)).input(completeObjectiveSchema).mutation(async ({ ctx, input }) => {
    return ctx.services.objective.complete(ctx.user.id, input.publicId)
  }),

  delete: protectedProcedure.use(rateLimit(RATE_LIMITS.strict)).input(deleteObjectiveSchema).mutation(async ({ ctx, input }) => {
    return ctx.services.objective.delete(ctx.user.id, input.publicId)
  })
})
