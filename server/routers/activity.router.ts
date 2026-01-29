import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { protectedProcedure, t } from '../trpc'

// Schema for grid position
const gridPositionSchema = z.object({
  x: z.number().int().min(0),
  y: z.number().int().min(0)
})

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
      return result?.tacticalState ?? null
    }),

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
    }),

  // Tactical combat: Execute movement
  executeTacticalMove: protectedProcedure
    .input(
      z.object({
        participationId: z.string(),
        unitId: z.string(),
        path: z.array(gridPositionSchema).min(2),
        movementRange: z.number().int().min(1)
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

      // Verify the unit being moved is a player unit (not an enemy)
      if (!input.unitId.startsWith('player-')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot move enemy units' })
      }

      return ctx.services.combat.executeTacticalMove(
        input.participationId,
        input.unitId,
        input.path,
        input.movementRange
      )
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
        attackRange: z.number().int().min(1),
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

      return ctx.services.combat.executeTacticalAttack(
        input.participationId,
        input.attackerId,
        input.targetId,
        input.attackRolls,
        input.defenseRolls,
        input.attackRange,
        input.attackThreshold,
        input.defenseThreshold,
        input.attackCriticalThreshold ?? 6
      )
    })
})
