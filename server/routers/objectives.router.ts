import { createObjectiveSchema, deleteObjectiveSchema, updateObjectiveSchema } from '../schemas/objectives.schemas'
import { getUserObjective } from '../services/objectives.services'
import { protectedProcedure, t } from '../trpc'

export const objectivesRouter = t.router({
  create: protectedProcedure.input(createObjectiveSchema).mutation(async ({ ctx, input }) => {
    const objective = await ctx.prisma.objective.create({
      data: {
        name: input.name,
        ...(input.description && { description: input.description }),
        ...(input.dueDate && { dueDate: input.dueDate }),
        userId: ctx.user.id,
        areas: {
          connect: input.areas?.map((areaId) => ({ id: areaId })) || []
        }
      },
      include: {
        areas: true
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
      },
      include: {
        areas: true
      }
    })

    return {
      objectives
    }
  }),
  update: protectedProcedure.input(updateObjectiveSchema).mutation(async ({ ctx, input }) => {
    await getUserObjective(ctx.prisma, input.id, ctx.user.id)

    const objective = await ctx.prisma.objective.update({
      where: {
        id: input.id
      },
      data: {
        name: input.name,
        ...(input.description && { description: input.description }),
        ...(input.dueDate && { dueDate: input.dueDate }),
        areas: {
          set: input.areas?.map((areaId) => ({ id: areaId })) || []
        }
      },
      include: {
        areas: true
      }
    })

    return {
      objective
    }
  }),
  delete: protectedProcedure.input(deleteObjectiveSchema).mutation(async ({ ctx, input }) => {
    await getUserObjective(ctx.prisma, input.id, ctx.user.id)

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
