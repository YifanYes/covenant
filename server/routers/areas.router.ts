import { createAreaSchema, deleteAreaSchema, updateAreaSchema } from '@schemas/areas.schemas'
import { getUserArea } from '../services/areas.services'
import { protectedProcedure, t } from '../trpc'

export const areasRouter = t.router({
  create: protectedProcedure.input(createAreaSchema).mutation(async ({ ctx, input }) => {
    const area = await ctx.prisma.area.create({
      data: {
        name: input.name,
        ...(input.color && { color: input.color }),
        ...(input.icon && { icon: input.icon }),
        userId: ctx.user.id
      }
    })

    return {
      area
    }
  }),
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const areas = await ctx.prisma.area.findMany({
      where: {
        userId: ctx.user.id
      }
    })

    return {
      areas
    }
  }),
  update: protectedProcedure.input(updateAreaSchema).mutation(async ({ ctx, input }) => {
    await getUserArea(ctx.prisma, input.id, ctx.user.id)

    const area = await ctx.prisma.area.update({
      where: {
        id: input.id
      },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.color && { color: input.color }),
        ...(input.icon && { icon: input.icon })
      }
    })

    return {
      area
    }
  }),
  delete: protectedProcedure.input(deleteAreaSchema).mutation(async ({ ctx, input }) => {
    await getUserArea(ctx.prisma, input.id, ctx.user.id)

    await ctx.prisma.area.delete({
      where: {
        id: input.id
      }
    })

    return {
      message: 'Area deleted successfully'
    }
  })
})
