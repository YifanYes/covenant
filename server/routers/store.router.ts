import { z } from 'zod'
import { protectedProcedure, t } from '../trpc'

export const storeRouter = t.router({
  list: protectedProcedure.query(async ({ ctx }) => ctx.services.store.listAvailableItems(ctx.user.id)),
  buy: protectedProcedure
    .input(z.object({ itemIds: z.array(z.string()).min(1) }))
    .mutation(async ({ ctx, input }) => ctx.services.store.purchaseItems(ctx.user.id, input.itemIds))
})
