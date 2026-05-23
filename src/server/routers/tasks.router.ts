import {
  bulkUpdateTasksSchema,
  createTaskSchema,
  duplicateTaskSchema,
  getByDateInputSchema,
  getTasksFilteredSchema,
  taskIdSchema,
  updateTaskSchema
} from '@shared/schemas/tasks.schemas'
import { protectedProcedure, rateLimit, RATE_LIMITS, t } from '../trpc'

export const tasksRouter = t.router({
  create: protectedProcedure.use(rateLimit(RATE_LIMITS.write)).input(createTaskSchema).mutation(async ({ ctx, input }) => {
    return ctx.services.task.create(ctx.user.id, input)
  }),

  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.services.task.getAll(ctx.user.id)
  }),

  getFiltered: protectedProcedure.input(getTasksFilteredSchema).query(async ({ ctx, input }) => {
    return ctx.services.task.getFiltered(ctx.user.id, input)
  }),

  getByDate: protectedProcedure.input(getByDateInputSchema).query(async ({ ctx, input }) => {
    const year = input.year ? Number(input.year) : undefined
    const monthIndex = input.monthIndex ? Number(input.monthIndex) : undefined
    return ctx.services.task.getByDate(ctx.user.id, year, monthIndex)
  }),

  update: protectedProcedure.use(rateLimit(RATE_LIMITS.write)).input(updateTaskSchema).mutation(async ({ ctx, input }) => {
    return ctx.services.task.update(ctx.user.id, input)
  }),

  bulkUpdate: protectedProcedure.use(rateLimit(RATE_LIMITS.write)).input(bulkUpdateTasksSchema).mutation(async ({ ctx, input }) => {
    return ctx.services.task.bulkUpdate(ctx.user.id, input.tasks)
  }),

  delete: protectedProcedure.use(rateLimit(RATE_LIMITS.strict)).input(taskIdSchema).mutation(async ({ ctx, input }) => {
    return ctx.services.task.delete(ctx.user.id, input.id)
  }),

  duplicate: protectedProcedure.use(rateLimit(RATE_LIMITS.strict)).input(duplicateTaskSchema).mutation(async ({ ctx, input }) => {
    return ctx.services.task.duplicate(ctx.user.id, input.id, input.titleSuffix)
  })
})
