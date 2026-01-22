import {
  createCharacterSchema,
  equipDoctrineSchema,
  equipItemSchema,
  switchClassSchema,
  unequipDoctrineSchema,
  unequipItemSchema,
  useConsumableSchema
} from '@shared/schemas/character.schemas'
import { protectedProcedure, t } from '../trpc'

export const characterRouter = t.router({
  create: protectedProcedure.input(createCharacterSchema).mutation(async ({ ctx, input }) => {
    return ctx.services.character.createCharacter(ctx.user.id, input)
  }),

  get: protectedProcedure.query(async ({ ctx }) => {
    return ctx.services.character.getCurrentClass(ctx.user.id)
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
  }),

  revive: protectedProcedure.mutation(async ({ ctx }) => {
    return ctx.services.character.revive(ctx.user.id)
  }),

  useConsumable: protectedProcedure.input(useConsumableSchema).mutation(async ({ ctx, input }) => {
    return ctx.services.combat.useConsumable(ctx.user.id, input.consumableId)
  }),

  getAvailableDoctrines: protectedProcedure.query(async ({ ctx }) => {
    return ctx.services.character.getAvailableDoctrinesForCharacter(ctx.user.id)
  }),

  equippedDoctrines: protectedProcedure.query(async ({ ctx }) => {
    return ctx.services.character.getEquippedDoctrines(ctx.user.id)
  }),

  equipDoctrine: protectedProcedure.input(equipDoctrineSchema).mutation(async ({ ctx, input }) => {
    return ctx.services.character.equipDoctrine(ctx.user.id, input.doctrineId)
  }),

  unequipDoctrine: protectedProcedure.input(unequipDoctrineSchema).mutation(async ({ ctx, input }) => {
    return ctx.services.character.unequipDoctrine(ctx.user.id, input.doctrineId)
  })
})
