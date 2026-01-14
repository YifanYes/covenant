import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { StoreService } from '../services/store.services'
import { protectedProcedure, t } from '../trpc'

const storeService = new StoreService(prisma)

export const storeRouter = t.router({
  list: protectedProcedure.query(async ({ ctx }) => storeService.listAvailableItems(ctx.user.id)),
  buy: protectedProcedure
    .input(z.object({ itemIds: z.array(z.string()).min(1) }))
    .mutation(async ({ ctx, input }) => storeService.purchaseItems(ctx.user.id, input.itemIds))
})
