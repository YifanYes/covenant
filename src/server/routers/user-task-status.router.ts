import {
  bulkApplyUserTaskStatusesSchema,
  createUserTaskStatusSchema,
  deleteUserTaskStatusSchema,
  updateUserTaskStatusSchema
} from '@shared/schemas/user-task-statuses.schemas'
import { protectedProcedure, rateLimit, RATE_LIMITS, t } from '../trpc'

export const userTaskStatusRouter = t.router({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.services.userTaskStatus.getAll(ctx.user.id)
  }),

  create: protectedProcedure
    .use(rateLimit(RATE_LIMITS.write))
    .input(createUserTaskStatusSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.services.userTaskStatus.create(ctx.user.id, input)
    }),

  update: protectedProcedure
    .use(rateLimit(RATE_LIMITS.write))
    .input(updateUserTaskStatusSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.services.userTaskStatus.update(ctx.user.id, input)
    }),

  delete: protectedProcedure
    .use(rateLimit(RATE_LIMITS.strict))
    .input(deleteUserTaskStatusSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.services.userTaskStatus.delete(ctx.user.id, input.publicId)
    }),

  bulkApply: protectedProcedure
    .use(rateLimit(RATE_LIMITS.write))
    .input(bulkApplyUserTaskStatusesSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.services.userTaskStatus.bulkApply(ctx.user.id, input)
    })
})
