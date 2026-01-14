import {
  createCharacterSchema,
  equipItemSchema,
  switchClassSchema,
  unequipItemSchema
} from '@shared/schemas/character.schemas'
import { protectedProcedure, t } from '../trpc'

export const characterRouter = t.router({
  create: protectedProcedure.input(createCharacterSchema).mutation(async ({ ctx, input }) => {
    return ctx.services.character.createCharacter(ctx.user.id, input)
  }),

  getCurrentClass: protectedProcedure.query(async ({ ctx }) => {
    return ctx.services.character.getCurrentClass(ctx.user.id)
  }),

  switchClass: protectedProcedure.input(switchClassSchema).mutation(async ({ ctx, input }) => {
    return ctx.services.character.switchClass(ctx.user.id, input.className)
  }),

  equipItem: protectedProcedure.input(equipItemSchema).mutation(async ({ ctx, input }) => {
    return ctx.services.character.equipItem(ctx.user.id, input.itemId)
  }),

  unequipItem: protectedProcedure.input(unequipItemSchema).mutation(async ({ ctx, input }) => {
    return ctx.services.character.unequipItem(ctx.user.id, input.slotType)
  }),

  hasCharacter: protectedProcedure.query(async ({ ctx }) => {
    const hasCharacter = await ctx.services.character.hasCharacter(ctx.user.id)
    return { hasCharacter }
  })
})
