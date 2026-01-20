import { z } from 'zod'
import { protectedProcedure, t } from '../trpc'

export const activityRouter = t.router({
  list: protectedProcedure
    .input(z.object({ characterId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.services.activity.getActivities(input?.characterId)
    }),

  join: protectedProcedure
    .input(z.object({ activityId: z.string(), characterId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return ctx.services.activity.joinActivity(input.activityId, input.characterId)
    }),

  resolveTurn: protectedProcedure
    .input(
      z.object({
        activityId: z.string(),
        characterId: z.string(),
        diceSpent: z.number(),
        attackRolls: z.array(z.number()),
        defenseRolls: z.array(z.number())
      })
    )
    .mutation(async ({ input, ctx }) => {
      const character = await ctx.services.character.getCharacterById(input.characterId)
      return ctx.services.activity.resolveCombatTurn(
        input.activityId,
        input.characterId,
        input.diceSpent,
        input.attackRolls,
        input.defenseRolls,
        character
      )
    })
})
