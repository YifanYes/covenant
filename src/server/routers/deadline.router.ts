import { t, publicProcedure } from '../trpc'

export const deadlineRouter = t.router({
  validateDeadlines: publicProcedure.mutation(async ({ ctx }) => {
    return ctx.services.deadline.validateDeadlines()
  })
})
