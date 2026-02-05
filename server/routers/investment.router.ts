import { contributeSchema, listInvestmentsSchema } from '@shared/schemas/investment.schemas'
import { TRPCError } from '@trpc/server'
import { protectedProcedure, t } from '../trpc'

export const investmentRouter = t.router({
  list: protectedProcedure.input(listInvestmentsSchema).query(async ({ ctx, input }) => {
    const isOwner = await ctx.services.character.verifyCharacterOwnership(input.characterId, ctx.user.id)
    if (!isOwner) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized to access this character' })
    }
    return ctx.services.investment.getInvestments(input.characterId)
  }),

  contribute: protectedProcedure.input(contributeSchema).mutation(async ({ ctx, input }) => {
    const isOwner = await ctx.services.character.verifyCharacterOwnership(input.characterId, ctx.user.id)
    if (!isOwner) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized to access this character' })
    }
    return ctx.services.investment.contribute(input.investmentId, input.characterId, input.amount)
  })
})
