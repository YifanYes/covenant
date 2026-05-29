import { publicIdSchema, slugSchema } from '@shared/schemas/ids.schemas'
import { z } from 'zod'
import { protectedProcedure, RATE_LIMITS, rateLimit, t } from '../trpc'

export const questRouter = t.router({
  getTacticalState: protectedProcedure.input(z.object({ questPublicId: publicIdSchema })).query(async ({ input, ctx }) => {
    return ctx.services.quest.getTacticalState(input.questPublicId, ctx.user.id)
  }),

  list: protectedProcedure
    .input(z.object({ characterSlug: slugSchema.optional() }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.services.quest.getAvailableQuests(ctx.user.id, input?.characterSlug)
    }),

  start: protectedProcedure
    .use(rateLimit(RATE_LIMITS.write))
    .input(z.object({ questTemplateId: z.string(), characterSlug: slugSchema }))
    .mutation(async ({ input, ctx }) => {
      return ctx.services.quest.startQuest(input.questTemplateId, input.characterSlug, ctx.user.id)
    }),

  abandon: protectedProcedure
    .use(rateLimit(RATE_LIMITS.write))
    .input(z.object({ questPublicId: publicIdSchema }))
    .mutation(async ({ input, ctx }) => {
      return ctx.services.quest.abandonQuest(input.questPublicId, ctx.user.id)
    }),

  getActive: protectedProcedure.input(z.object({ characterSlug: slugSchema })).query(async ({ input, ctx }) => {
    return ctx.services.quest.getActiveQuest(input.characterSlug, ctx.user.id)
  }),

  executeMove: protectedProcedure
    .use(rateLimit(RATE_LIMITS.combat))
    .input(
      z.object({
        questPublicId: publicIdSchema,
        casterId: z.string(),
        moveId: z.string(),
        targetIds: z.array(z.string())
      })
    )
    .mutation(async ({ input, ctx }) => {
      return ctx.services.combat.playerExecuteMove(
        ctx.user.id,
        input.questPublicId,
        input.casterId,
        input.moveId,
        input.targetIds
      )
    }),

  executeTacticalEnemyTurn: protectedProcedure
    .use(rateLimit(RATE_LIMITS.combat))
    .input(
      z.object({
        questPublicId: publicIdSchema,
        enemyId: z.string()
      })
    )
    .mutation(async ({ input, ctx }) => {
      return ctx.services.combat.playerEnemyTurn(ctx.user.id, input.questPublicId, input.enemyId)
    }),

  usePotion: protectedProcedure
    .use(rateLimit(RATE_LIMITS.write))
    .input(
      z.object({
        questPublicId: publicIdSchema,
        consumableId: z.string()
      })
    )
    .mutation(async ({ input, ctx }) => {
      return ctx.services.combat.playerUsePotion(ctx.user.id, input.questPublicId, input.consumableId)
    })
})
