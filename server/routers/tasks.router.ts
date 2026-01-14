import {
  bulkUpdateTasksSchema,
  createTaskSchema,
  duplicateTaskSchema,
  getByDateInputSchema,
  taskIdSchema,
  TaskStatus,
  updateTaskSchema
} from '@shared/schemas/tasks.schemas'
import { protectedProcedure, t } from '../trpc'

export const tasksRouter = t.router({
  create: protectedProcedure.input(createTaskSchema).mutation(async ({ ctx, input }) => {
    return ctx.services.task.create(ctx.user.id, input)
  }),

  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.services.task.getAll(ctx.user.id)
  }),

  getByDate: protectedProcedure.input(getByDateInputSchema).query(async ({ ctx, input }) => {
    const year = input.year ? Number(input.year) : undefined
    const monthIndex = input.monthIndex ? Number(input.monthIndex) : undefined
    return ctx.services.task.getByDate(ctx.user.id, year, monthIndex)
  }),

  update: protectedProcedure.input(updateTaskSchema).mutation(async ({ ctx, input }) => {
    return ctx.services.task.update(ctx.user.id, input, TaskStatus.DONE)
  }),

  bulkUpdate: protectedProcedure.input(bulkUpdateTasksSchema).mutation(async ({ ctx, input }) => {
    return ctx.services.task.bulkUpdate(ctx.user.id, input.tasks)
  }),

  delete: protectedProcedure.input(taskIdSchema).mutation(async ({ ctx, input }) => {
    return ctx.services.task.delete(ctx.user.id, input.id)
  }),

  duplicate: protectedProcedure.input(duplicateTaskSchema).mutation(async ({ ctx, input }) => {
    return ctx.services.task.duplicate(ctx.user.id, input.id, input.titleSuffix)
  })
})
