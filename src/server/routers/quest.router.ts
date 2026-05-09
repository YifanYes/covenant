import {
  type SelfBuffDoctrineResultWithMana,
  type TacticalDoctrineResultWithMana
} from '@shared/types/tactical-combat.types'
import { z } from 'zod'
import { protectedProcedure, RATE_LIMITS, rateLimit, t } from '../trpc'

export const questRouter = t.router({
  // Get tactical combat state for a quest
  getTacticalState: protectedProcedure.input(z.object({ questId: z.string() })).query(async ({ input, ctx }) => {
    return ctx.services.quest.getTacticalState(input.questId, ctx.user.id)
  }),

  // List available quest templates (with optional active-quest status for a character)
  list: protectedProcedure
    .input(z.object({ characterId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.services.quest.getAvailableQuests(ctx.user.id, input?.characterId)
    }),

  // Start a quest for a character
  start: protectedProcedure
    .use(rateLimit(RATE_LIMITS.write))
    .input(z.object({ questId: z.string(), characterId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return ctx.services.quest.startQuest(input.questId, input.characterId, ctx.user.id)
    }),

  // Abandon an active quest
  abandon: protectedProcedure
    .use(rateLimit(RATE_LIMITS.write))
    .input(z.object({ questId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return ctx.services.quest.abandonQuest(input.questId, ctx.user.id)
    }),

  // Get active quest for a character
  getActive: protectedProcedure.input(z.object({ characterId: z.string() })).query(async ({ input, ctx }) => {
    return ctx.services.quest.getActiveQuest(input.characterId, ctx.user.id)
  }),

  // Tactical combat: Execute attack
  executeTacticalAttack: protectedProcedure
    .use(rateLimit(RATE_LIMITS.combat))
    .input(
      z.object({
        questId: z.string(),
        attackerId: z.string(),
        targetId: z.string(),
        attackRolls: z.array(z.number().min(1).max(6)),
        defenseRolls: z.array(z.number().min(1).max(6)),
        attackThreshold: z.number().int().min(1).max(6),
        defenseThreshold: z.number().int().min(1).max(6),
        attackCriticalThreshold: z.number().int().min(1).max(6).optional()
      })
    )
    .mutation(async ({ input, ctx }) => {
      return ctx.services.combat.playerAttack(
        ctx.user.id,
        input.questId,
        input.attackerId,
        input.targetId,
        input.attackRolls,
        input.defenseRolls,
        input.attackThreshold,
        input.defenseThreshold,
        input.attackCriticalThreshold ?? 6
      )
    }),

  // Tactical combat: Execute enemy AI turn
  executeTacticalEnemyTurn: protectedProcedure
    .use(rateLimit(RATE_LIMITS.combat))
    .input(
      z.object({
        questId: z.string(),
        enemyId: z.string(),
        enemyAttackDice: z.number().int().min(1),
        enemyAttackThreshold: z.number().int().min(1).max(6)
      })
    )
    .mutation(async ({ input, ctx }) => {
      return ctx.services.combat.playerEnemyTurn(
        ctx.user.id,
        input.questId,
        input.enemyId,
        input.enemyAttackDice,
        input.enemyAttackThreshold
      )
    }),

  // Tactical combat: Execute doctrine with targeting
  executeTacticalDoctrine: protectedProcedure
    .use(rateLimit(RATE_LIMITS.write))
    .input(
      z.object({
        questId: z.string(),
        casterId: z.string(),
        doctrineId: z.string(),
        targeting: z.enum(['single', 'all']),
        targetIds: z.array(z.string())
      })
    )
    .mutation(async ({ input, ctx }): Promise<TacticalDoctrineResultWithMana> => {
      return ctx.services.combat.playerCastDoctrine(
        ctx.user.id,
        input.questId,
        input.casterId,
        input.doctrineId,
        input.targeting,
        input.targetIds
      )
    }),

  // Tactical combat: Use self-buff doctrine (no targeting required)
  useSelfBuffDoctrine: protectedProcedure
    .use(rateLimit(RATE_LIMITS.write))
    .input(
      z.object({
        questId: z.string(),
        casterId: z.string(),
        doctrineId: z.string()
      })
    )
    .mutation(async ({ input, ctx }): Promise<SelfBuffDoctrineResultWithMana> => {
      return ctx.services.combat.playerCastSelfBuffDoctrine(
        ctx.user.id,
        input.questId,
        input.casterId,
        input.doctrineId
      )
    }),

  // Tactical combat: Use potion during combat
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
