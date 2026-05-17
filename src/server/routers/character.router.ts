import {
  createCharacterSchema,
  equipAbilitySchema,
  equipItemSchema,
  switchClassSchema,
  unequipAbilitySchema,
  unequipItemSchema,
  updateCharacterNameSchema,
  useConsumableSchema
} from '@shared/schemas/character.schemas'
import { z } from 'zod'
import { protectedProcedure, rateLimit, RATE_LIMITS, t } from '../trpc'

export const characterRouter = t.router({
  create: protectedProcedure.use(rateLimit(RATE_LIMITS.strict)).input(createCharacterSchema).mutation(async ({ ctx, input }) => {
    return ctx.services.character.createCharacter(ctx.user.id, input)
  }),

  get: protectedProcedure.query(async ({ ctx }) => {
    return ctx.services.character.getCurrentClass(ctx.user.id)
  }),

  getCurrentClass: protectedProcedure.query(async ({ ctx }) => {
    return ctx.services.character.getCurrentClass(ctx.user.id)
  }),

  getTodayReserveBreakdown: protectedProcedure
    .input(z.object({ timezoneOffset: z.number().int().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.services.character.getTodayReserveBreakdown(ctx.user.id, input?.timezoneOffset)
    }),

  switchClass: protectedProcedure.use(rateLimit(RATE_LIMITS.write)).input(switchClassSchema).mutation(async ({ ctx, input }) => {
    return ctx.services.character.switchClass(ctx.user.id, input.className)
  }),

  equipItem: protectedProcedure.use(rateLimit(RATE_LIMITS.write)).input(equipItemSchema).mutation(async ({ ctx, input }) => {
    return ctx.services.character.equipItem(ctx.user.id, input.itemId)
  }),

  unequipItem: protectedProcedure.use(rateLimit(RATE_LIMITS.write)).input(unequipItemSchema).mutation(async ({ ctx, input }) => {
    return ctx.services.character.unequipItem(ctx.user.id, input.slotType)
  }),

  hasCharacter: protectedProcedure.query(async ({ ctx }) => {
    const hasCharacter = await ctx.services.character.hasCharacter(ctx.user.id)
    return { hasCharacter }
  }),

  revive: protectedProcedure.use(rateLimit(RATE_LIMITS.strict)).mutation(async ({ ctx }) => {
    return ctx.services.character.revive(ctx.user.id)
  }),

  useConsumable: protectedProcedure.use(rateLimit(RATE_LIMITS.write)).input(useConsumableSchema).mutation(async ({ ctx, input }) => {
    return ctx.services.combat.useConsumable(ctx.user.id, input.consumableId)
  }),

  getAvailableAbilities: protectedProcedure.query(async ({ ctx }) => {
    return ctx.services.character.getAvailableAbilitiesForCharacter(ctx.user.id)
  }),

  equippedAbilities: protectedProcedure.query(async ({ ctx }) => {
    return ctx.services.character.getEquippedAbilities(ctx.user.id)
  }),

  equipAbility: protectedProcedure.use(rateLimit(RATE_LIMITS.write)).input(equipAbilitySchema).mutation(async ({ ctx, input }) => {
    return ctx.services.character.equipAbility(ctx.user.id, input.abilityId)
  }),

  unequipAbility: protectedProcedure.use(rateLimit(RATE_LIMITS.write)).input(unequipAbilitySchema).mutation(async ({ ctx, input }) => {
    return ctx.services.character.unequipAbility(ctx.user.id, input.abilityId)
  }),

  updateName: protectedProcedure.use(rateLimit(RATE_LIMITS.write)).input(updateCharacterNameSchema).mutation(async ({ ctx, input }) => {
    return ctx.services.character.updateName(ctx.user.id, input.name)
  }),

  completeTutorial: protectedProcedure.use(rateLimit(RATE_LIMITS.write)).mutation(({ ctx }) =>
    ctx.services.character.completeTutorial(ctx.user.id)
  ),

  resetTutorial: protectedProcedure.use(rateLimit(RATE_LIMITS.write)).mutation(({ ctx }) =>
    ctx.services.character.resetTutorial(ctx.user.id)
  )
})
