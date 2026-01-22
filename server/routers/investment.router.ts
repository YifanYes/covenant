import { contributeSchema, listInvestmentsSchema } from '@shared/schemas/investment.schemas'
import { protectedProcedure, t } from '../trpc'

export const investmentRouter = t.router({
  list: protectedProcedure.input(listInvestmentsSchema).query(async ({ ctx, input }) => {
    return ctx.services.investment.getInvestments(input.characterId)
  }),

  contribute: protectedProcedure.input(contributeSchema).mutation(async ({ ctx, input }) => {
    return ctx.services.investment.contribute(input.investmentId, input.characterId, input.amount)
  })
})
