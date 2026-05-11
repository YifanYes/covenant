import { z } from 'zod'
import { protectedProcedure, RATE_LIMITS, rateLimit, t } from '../trpc'

export const questRouter = t.router({
  // Get tactical combat state for a quest
  getTacticalState: protectedProcedure.input(z.object({ questId: z.string() })).query(async ({ input, ctx }) => {
    return ctx.services.quest.getTacticalState(input.questId, ctx.user.id)
  }),

  list: protectedProcedure
    .input(z.object({ characterId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.services.quest.getAvailableQuests(ctx.user.id, input?.characterId)
    }),

  start: protectedProcedure
    .use(rateLimit(RATE_LIMITS.write))
    .input(z.object({ questId: z.string(), characterId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return ctx.services.quest.startQuest(input.questId, input.characterId, ctx.user.id)
    }),

  abandon: protectedProcedure
    .use(rateLimit(RATE_LIMITS.write))
    .input(z.object({ questId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return ctx.services.quest.abandonQuest(input.questId, ctx.user.id)
    }),

  getActive: protectedProcedure.input(z.object({ characterId: z.string() })).query(async ({ input, ctx }) => {
    return ctx.services.quest.getActiveQuest(input.characterId, ctx.user.id)
  }),

  // Phase 2A: unified Pokémon-style move execution. Replaces executeTacticalAttack + executeTacticalAbility.
  executeMove: protectedProcedure
    .use(rateLimit(RATE_LIMITS.combat))
    .input(
      z.object({
        questId: z.string(),
        casterId: z.string(),
        moveId: z.string(),
        targetIds: z.array(z.string())
      })
    )
    .mutation(async ({ input, ctx }) => {
      return ctx.services.combat.playerExecuteMove(
        ctx.user.id,
        input.questId,
        input.casterId,
        input.moveId,
        input.targetIds
      )
    }),

  executeTacticalEnemyTurn: protectedProcedure
    .use(rateLimit(RATE_LIMITS.combat))
    .input(
      z.object({
        questId: z.string(),
        enemyId: z.string()
      })
    )
    .mutation(async ({ input, ctx }) => {
      return ctx.services.combat.playerEnemyTurn(ctx.user.id, input.questId, input.enemyId)
    }),

  usePotion: protectedProcedure
    .use(rateLimit(RATE_LIMITS.write))
    .input(
      z.object({
        questId: z.string(),
        consumableId: z.string()
      })
    )
    .mutation(async ({ input, ctx }) => {
      return ctx.services.combat.playerUsePotion(ctx.user.id, input.questId, input.consumableId)
    })
})
