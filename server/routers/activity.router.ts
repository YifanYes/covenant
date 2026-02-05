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

      // Consume dice from the player's dice bank (attack + defense dice)
      const totalDiceUsed = input.attackRolls.length + input.defenseRolls.length
      await ctx.services.dice.consumeDiceFromBank(ctx.user.id, totalDiceUsed)

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
    }),

  // Tactical combat: Execute enemy AI turn
  executeTacticalEnemyTurn: protectedProcedure
    .input(
      z.object({
        participationId: z.string(),
        enemyId: z.string(),
        enemyMovementRange: z.number().int().min(1),
        enemyAttackRange: z.number().int().min(1),
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
        input.enemyMovementRange,
        input.enemyAttackRange,
        input.enemyAttackDice,
        input.enemyAttackThreshold
      )
    }),

  // Tactical combat: Execute doctrine with AoE targeting
  executeTacticalDoctrine: protectedProcedure
    .input(
      z.object({
        participationId: z.string(),
        casterId: z.string(),
        doctrineId: z.string(),
        targetPosition: gridPositionSchema
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
        input.targetPosition,
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
        return { ...result, newMana }
      }

      return result
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
    .mutation(async ({ input, ctx }) => {
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
        return { ...result, newMana }
      }

      return result
    })
})
