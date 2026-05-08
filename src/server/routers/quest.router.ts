import {
  TACTICAL_STATE_VERSION,
  type SelfBuffDoctrineResultWithMana,
  type TacticalDoctrineResultWithMana,
  type TacticalStateData
} from '@shared/types/tactical-combat.types'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { protectedProcedure, rateLimit, RATE_LIMITS, t } from '../trpc'

export const questRouter = t.router({
  // Get tactical combat state for a quest
  getTacticalState: protectedProcedure
    .input(z.object({ questId: z.string() }))
    .query(async ({ input, ctx }) => {
      const isOwner = await ctx.services.characterQuest.verifyOwnership(input.questId, ctx.user.id)
      if (!isOwner) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized to access this combat' })
      }

      const result = await ctx.services.characterQuest.findByIdWithTacticalState(input.questId)
      const state = result?.tacticalState as TacticalStateData | null
      if (state && state.stateVersion !== TACTICAL_STATE_VERSION) return null
      return state
    }),

  // List available quest templates (with optional active-quest status for a character)
  list: protectedProcedure
    .input(z.object({ characterId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      if (input?.characterId) {
        const isOwner = await ctx.services.character.verifyCharacterOwnership(input.characterId, ctx.user.id)
        if (!isOwner) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized to access this character' })
        }
      }
      return ctx.services.quest.getAvailableQuests(input?.characterId)
    }),

  // Start a quest for a character
  start: protectedProcedure
    .use(rateLimit(RATE_LIMITS.write))
    .input(z.object({ questId: z.string(), characterId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const isOwner = await ctx.services.character.verifyCharacterOwnership(input.characterId, ctx.user.id)
      if (!isOwner) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized to access this character' })
      }
      return ctx.services.quest.startQuest(input.questId, input.characterId)
    }),

  // Abandon an active quest
  abandon: protectedProcedure
    .use(rateLimit(RATE_LIMITS.write))
    .input(z.object({ questId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return ctx.services.quest.abandonQuest(input.questId, ctx.user.id)
    }),

  // Get active quest for a character
  getActive: protectedProcedure
    .input(z.object({ characterId: z.string() }))
    .query(async ({ input, ctx }) => {
      const isOwner = await ctx.services.character.verifyCharacterOwnership(input.characterId, ctx.user.id)
      if (!isOwner) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized to access this character' })
      }
      return ctx.services.quest.getActiveQuest(input.characterId)
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
      const isOwner = await ctx.services.characterQuest.verifyOwnership(input.questId, ctx.user.id)
      if (!isOwner) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized to control this combat' })
      }

      if (!input.attackerId.startsWith('player-')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot attack with enemy units' })
      }

      const totalDiceUsed = input.attackRolls.length + input.defenseRolls.length
      await ctx.services.dice.consumeDiceFromBank(ctx.user.id, totalDiceUsed)

      return ctx.services.combat.executeTacticalAttack(
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
      const isOwner = await ctx.services.characterQuest.verifyOwnership(input.questId, ctx.user.id)
      if (!isOwner) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized to control this combat' })
      }

      if (input.enemyId.startsWith('player-')) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot execute AI turn for player units' })
      }

      return ctx.services.combat.executeEnemyTurn(
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
      const isOwner = await ctx.services.characterQuest.verifyOwnership(input.questId, ctx.user.id)
      if (!isOwner) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized to control this combat' })
      }

      if (!input.casterId.startsWith('player-')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot cast doctrine with enemy units' })
      }

      const character = await ctx.services.character.getCurrentClass(ctx.user.id)
      if (!character) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Character not found' })
      }
      const currentClass = character.classes.find((c) => c.className === character.currentClass)
      if (!currentClass) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Character class not found' })
      }

      const result = await ctx.services.combat.executeTacticalDoctrine(
        input.questId,
        input.casterId,
        input.doctrineId,
        input.targeting,
        input.targetIds,
        currentClass.mana
      )

      if (result.success) {
        const newMana = currentClass.mana - result.manaCost
        await ctx.services.character.updateHealth(currentClass.id, currentClass.health, newMana)
        return { ...result, success: true as const, newMana }
      }

      return { ...result, success: false as const }
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
      const isOwner = await ctx.services.characterQuest.verifyOwnership(input.questId, ctx.user.id)
      if (!isOwner) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized to control this combat' })
      }

      if (!input.casterId.startsWith('player-')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot cast doctrine with enemy units' })
      }

      const character = await ctx.services.character.getCurrentClass(ctx.user.id)
      if (!character) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Character not found' })
      }
      const currentClass = character.classes.find((c) => c.className === character.currentClass)
      if (!currentClass) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Character class not found' })
      }

      const result = await ctx.services.combat.useSelfBuffDoctrine(
        input.questId,
        input.casterId,
        input.doctrineId,
        currentClass.mana
      )

      if (result.success) {
        const newMana = currentClass.mana - result.manaCost
        await ctx.services.character.updateHealth(currentClass.id, currentClass.health, newMana)
        return { ...result, success: true as const, newMana }
      }

      return { ...result, success: false as const }
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
      const isOwner = await ctx.services.characterQuest.verifyOwnership(input.questId, ctx.user.id)
      if (!isOwner) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized to control this combat' })
      }

      const quest = await ctx.services.characterQuest.findByIdWithTacticalState(input.questId)
      if (quest?.tacticalState?.potionUsedThisTurn) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Already used a potion this turn' })
      }

      const result = await ctx.services.combat.useConsumable(ctx.user.id, input.consumableId)

      if (result.success && quest?.tacticalState) {
        await ctx.services.characterQuest.updateTacticalState(input.questId, {
          ...quest.tacticalState,
          potionUsedThisTurn: true
        })
      }

      return result
    })
})
