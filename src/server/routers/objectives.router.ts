import {
  completeObjectiveSchema,
  createObjectiveSchema,
  deleteObjectiveSchema,
  updateObjectiveSchema
} from '@shared/schemas/objectives.schemas'
import { protectedProcedure, t } from '../trpc'

export const objectivesRouter = t.router({
  create: protectedProcedure.input(createObjectiveSchema).mutation(async ({ ctx, input }) => {
    return ctx.services.objective.create(ctx.user.id, input)
  }),

  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.services.objective.getAll(ctx.user.id)
  }),

  update: protectedProcedure.input(updateObjectiveSchema).mutation(async ({ ctx, input }) => {
    return ctx.services.objective.update(ctx.user.id, input)
  }),

  complete: protectedProcedure.input(completeObjectiveSchema).mutation(async ({ ctx, input }) => {
    return ctx.services.objective.complete(ctx.user.id, input.id)
  }),

  delete: protectedProcedure.input(deleteObjectiveSchema).mutation(async ({ ctx, input }) => {
    return ctx.services.objective.delete(ctx.user.id, input.id)
  })
})
