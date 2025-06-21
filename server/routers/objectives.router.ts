import { createObjectiveSchema, deleteObjectiveSchema, updateObjectiveSchema } from '../schemas/objectives.schemas'
import { protectedProcedure, t } from '../trpc'

export const objectivesRouter = t.router({
  create: protectedProcedure.input(createObjectiveSchema).mutation(async ({ ctx, input }) => {
    const objective = await ctx.prisma.objective.create({
      data: {
        name: input.name,
        ...(input.description && { description: input.description }),
        userId: ctx.user.id
      }
    })

    return {
      objective
    }
  }),
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const objectives = await ctx.prisma.objective.findMany({
      where: {
        userId: ctx.user.id
      }
    })

    return {
      objectives
    }
  }),
  update: protectedProcedure.input(updateObjectiveSchema).mutation(async ({ ctx, input }) => {
    const objective = await ctx.prisma.objective.update({
      where: {
        id: input.id
      },
      data: {
        name: input.name,
        ...(input.description && { description: input.description })
      }
    })

    return {
      objective
    }
  }),
  delete: protectedProcedure.input(deleteObjectiveSchema).mutation(async ({ ctx, input }) => {
    await ctx.prisma.objective.delete({
      where: {
        id: input.id
      }
    })

    return {
      message: 'Objective deleted successfully'
    }
  })
})
