import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { protectedProcedure, t } from '../trpc'
import type {
  TacticalDoctrineResultWithMana,
  SelfBuffDoctrineResultWithMana,
  TacticalStateData
} from '@shared/types/tactical-combat.types'

export const activityRouter = t.router({
  // Get tactical combat state for a participation
  getTacticalState: protectedProcedure
    .input(z.object({ participationId: z.string() }))
    .query(async ({ input, ctx }) => {
      // Verify the user owns this participation
      const isOwner = await ctx.services.activityParticipation.verifyOwnership(
        input.participationId,
        ctx.user.id
      )
      if (!isOwner) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized to access this combat' })
      }

      const result = await ctx.services.activityParticipation.findByIdWithTacticalState(input.participationId)
      const state = result?.tacticalState as TacticalStateData | null
      // Auto-reset old grid-based state — re-joining will re-initialize
      if (state && state.stateVersion !== 2) return null
      return state
    }),

  list: protectedProcedure
    .input(z.object({ characterId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      if (input?.characterId) {
        const isOwner = await ctx.services.character.verifyCharacterOwnership(input.characterId, ctx.user.id)
        if (!isOwner) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized to access this character' })
        }
      }
      return ctx.services.activity.getActivities(input?.characterId)
    }),

  join: protectedProcedure
    .input(z.object({ activityId: z.string(), characterId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const isOwner = await ctx.services.character.verifyCharacterOwnership(input.characterId, ctx.user.id)
      if (!isOwner) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized to access this character' })
      }
      return ctx.services.activity.joinActivity(input.activityId, input.characterId)
    }),

  // Tactical combat: Execute attack
  executeTacticalAttack: protectedProcedure
    .input(
      z.object({
        participationId: z.string(),
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
      // Verify the user owns this participation
      const isOwner = await ctx.services.activityParticipation.verifyOwnership(
        input.participationId,
        ctx.user.id
      )
      if (!isOwner) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized to control this combat' })
      }

      // Verify the attacker is a player unit
      if (!input.attackerId.startsWith('player-')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot attack with enemy units' })
      }

      // Consume dice from the player's dice bank (attack + defense dice)
      const totalDiceUsed = input.attackRolls.length + input.defenseRolls.length
      await ctx.services.dice.consumeDiceFromBank(ctx.user.id, totalDiceUsed)

      return ctx.services.combat.executeTacticalAttack(
        input.participationId,
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
    .input(
      z.object({
        participationId: z.string(),
        enemyId: z.string(),
        enemyAttackDice: z.number().int().min(1),
        enemyAttackThreshold: z.number().int().min(1).max(6)
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify the user owns this participation
      const isOwner = await ctx.services.activityParticipation.verifyOwnership(
        input.participationId,
        ctx.user.id
      )
      if (!isOwner) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized to control this combat' })
      }

      // Verify the unit is an enemy (not a player unit)
      if (input.enemyId.startsWith('player-')) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot execute AI turn for player units' })
      }

      return ctx.services.combat.executeEnemyTurn(
        input.participationId,
        input.enemyId,
        input.enemyAttackDice,
        input.enemyAttackThreshold
      )
    }),

  // Tactical combat: Execute doctrine with targeting
  executeTacticalDoctrine: protectedProcedure
    .input(
      z.object({
        participationId: z.string(),
        casterId: z.string(),
        doctrineId: z.string(),
        targeting: z.enum(['single', 'all']),
        targetIds: z.array(z.string())
      })
    )
    .mutation(async ({ input, ctx }): Promise<TacticalDoctrineResultWithMana> => {
      // Verify the user owns this participation
      const isOwner = await ctx.services.activityParticipation.verifyOwnership(
        input.participationId,
        ctx.user.id
      )
      if (!isOwner) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized to control this combat' })
      }

      // Verify the caster is a player unit
      if (!input.casterId.startsWith('player-')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot cast doctrine with enemy units' })
      }

      // Fetch authoritative mana from database instead of trusting client
      const character = await ctx.services.character.getCurrentClass(ctx.user.id)
      if (!character) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Character not found' })
      }
      const currentClass = character.classes.find((c) => c.className === character.currentClass)
      if (!currentClass) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Character class not found' })
      }

      const result = await ctx.services.combat.executeTacticalDoctrine(
        input.participationId,
        input.casterId,
        input.doctrineId,
        input.targeting,
        input.targetIds,
        currentClass.mana
      )

      // Deduct mana from the character's class after successful doctrine use
      if (result.success) {
        const newMana = currentClass.mana - result.manaCost
        await ctx.services.character.updateHealth(
          currentClass.id,
          currentClass.health,
          newMana
        )
        // Return newMana so frontend uses authoritative server value
        return { ...result, success: true as const, newMana }
      }

      return { ...result, success: false as const }
    }),

  // Tactical combat: Use self-buff doctrine (no targeting required)
  useSelfBuffDoctrine: protectedProcedure
    .input(
      z.object({
        participationId: z.string(),
        casterId: z.string(),
        doctrineId: z.string()
      })
    )
    .mutation(async ({ input, ctx }): Promise<SelfBuffDoctrineResultWithMana> => {
      // Verify the user owns this participation
      const isOwner = await ctx.services.activityParticipation.verifyOwnership(
        input.participationId,
        ctx.user.id
      )
      if (!isOwner) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized to control this combat' })
      }

      // Verify the caster is a player unit
      if (!input.casterId.startsWith('player-')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot cast doctrine with enemy units' })
      }

      // Fetch authoritative mana from database instead of trusting client
      const character = await ctx.services.character.getCurrentClass(ctx.user.id)
      if (!character) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Character not found' })
      }
      const currentClass = character.classes.find((c) => c.className === character.currentClass)
      if (!currentClass) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Character class not found' })
      }

      const result = await ctx.services.combat.useSelfBuffDoctrine(
        input.participationId,
        input.casterId,
        input.doctrineId,
        currentClass.mana
      )

      // Deduct mana from the character's class after successful doctrine use
      if (result.success) {
        const newMana = currentClass.mana - result.manaCost
        await ctx.services.character.updateHealth(
          currentClass.id,
          currentClass.health,
          newMana
        )
        // Return newMana so frontend uses authoritative server value
        return { ...result, success: true as const, newMana }
      }

      return { ...result, success: false as const }
    }),

  // Tactical combat: Use potion during combat
  usePotion: protectedProcedure
    .input(
      z.object({
        participationId: z.string(),
        consumableId: z.string()
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify the user owns this participation
      const isOwner = await ctx.services.activityParticipation.verifyOwnership(
        input.participationId,
        ctx.user.id
      )
      if (!isOwner) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized to control this combat' })
      }

      // Check if potion already used this turn
      const participation = await ctx.services.activityParticipation.findByIdWithTacticalState(input.participationId)
      if (participation?.tacticalState?.potionUsedThisTurn) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Already used a potion this turn' })
      }

      // Use the consumable via existing CombatService
      const result = await ctx.services.combat.useConsumable(ctx.user.id, input.consumableId)

      // Set potionUsedThisTurn flag
      if (result.success && participation?.tacticalState) {
        await ctx.services.activityParticipation.updateTacticalState(input.participationId, {
          ...participation.tacticalState,
          potionUsedThisTurn: true
        })
      }

      return result
    })
})
