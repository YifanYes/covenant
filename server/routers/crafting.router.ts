import { craftItemInputSchema } from '@shared/schemas/crafting.schemas'
import { protectedProcedure, t } from '../trpc'

export const craftingRouter = t.router({
  getMaterials: protectedProcedure.query(async ({ ctx }) => ctx.services.crafting.getMaterials(ctx.user.id)),

  listRecipes: protectedProcedure.query(async ({ ctx }) => ctx.services.crafting.listRecipes(ctx.user.id)),

  craft: protectedProcedure
    .input(craftItemInputSchema)
    .mutation(async ({ ctx, input }) => ctx.services.crafting.craftItem(ctx.user.id, input.recipeId))
})
