import {
  createHabitSchema,
  habitCompletionIdSchema,
  habitIdSchema,
  updateHabitSchema
} from '@shared/schemas/habits.schemas'
import { protectedProcedure, rateLimit, RATE_LIMITS, t } from '../trpc'

export const habitsRouter = t.router({
  create: protectedProcedure.use(rateLimit(RATE_LIMITS.write)).input(createHabitSchema).mutation(async ({ ctx, input }) => {
    return ctx.services.habit.create(ctx.user.id, input)
  }),

  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.services.habit.getAll(ctx.user.id)
  }),

  getById: protectedProcedure.input(habitIdSchema).query(async ({ ctx, input }) => {
    return ctx.services.habit.getById(ctx.user.id, input.publicId)
  }),

  update: protectedProcedure.use(rateLimit(RATE_LIMITS.write)).input(updateHabitSchema).mutation(async ({ ctx, input }) => {
    return ctx.services.habit.update(ctx.user.id, input)
  }),

  delete: protectedProcedure.use(rateLimit(RATE_LIMITS.strict)).input(habitIdSchema).mutation(async ({ ctx, input }) => {
    return ctx.services.habit.delete(ctx.user.id, input.publicId)
  }),

  restore: protectedProcedure.use(rateLimit(RATE_LIMITS.strict)).input(habitIdSchema).mutation(async ({ ctx, input }) => {
    return ctx.services.habit.restore(ctx.user.id, input.publicId)
  }),

  getDeleted: protectedProcedure.query(async ({ ctx }) => {
    return ctx.services.habit.getDeleted(ctx.user.id)
  }),

  createCompletion: protectedProcedure.use(rateLimit(RATE_LIMITS.write)).input(habitIdSchema).mutation(async ({ ctx, input }) => {
    return ctx.services.habit.createCompletion(ctx.user.id, input.publicId)
  }),

  deleteCompletion: protectedProcedure.use(rateLimit(RATE_LIMITS.strict)).input(habitCompletionIdSchema).mutation(async ({ ctx, input }) => {
    return ctx.services.habit.deleteCompletion(ctx.user.id, input.publicId)
  })
})
