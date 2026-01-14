import {
  createHabitSchema,
  habitCompletionIdSchema,
  habitIdSchema,
  updateHabitSchema
} from '@shared/schemas/habits.schemas'
import { protectedProcedure, t } from '../trpc'

export const habitsRouter = t.router({
  create: protectedProcedure.input(createHabitSchema).mutation(async ({ ctx, input }) => {
    return ctx.services.habit.create(ctx.user.id, input)
  }),

  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.services.habit.getAll(ctx.user.id)
  }),

  getById: protectedProcedure.input(habitIdSchema).query(async ({ ctx, input }) => {
    return ctx.services.habit.getById(ctx.user.id, input.id)
  }),

  update: protectedProcedure.input(updateHabitSchema).mutation(async ({ ctx, input }) => {
    return ctx.services.habit.update(ctx.user.id, input)
  }),

  delete: protectedProcedure.input(habitIdSchema).mutation(async ({ ctx, input }) => {
    return ctx.services.habit.delete(ctx.user.id, input.id)
  }),

  restore: protectedProcedure.input(habitIdSchema).mutation(async ({ ctx, input }) => {
    return ctx.services.habit.restore(ctx.user.id, input.id)
  }),

  getDeleted: protectedProcedure.query(async ({ ctx }) => {
    return ctx.services.habit.getDeleted(ctx.user.id)
  }),

  createCompletion: protectedProcedure.input(habitIdSchema).mutation(async ({ ctx, input }) => {
    return ctx.services.habit.createCompletion(ctx.user.id, input.id)
  }),

  deleteCompletion: protectedProcedure.input(habitCompletionIdSchema).mutation(async ({ ctx, input }) => {
    return ctx.services.habit.deleteCompletion(ctx.user.id, input.id)
  })
})
