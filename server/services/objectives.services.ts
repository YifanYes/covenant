import { TRPCError } from '@trpc/server'
import { Objective, PrismaClient } from '../generated/prisma/client'

export const getUserObjective = async (
  prisma: PrismaClient,
  objectiveId: string,
  userId: string
): Promise<Objective> => {
  const objective = await prisma.objective.findFirst({
    where: {
      id: objectiveId,
      userId: userId
    }
  })

  if (!objective) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Objective not found'
    })
  }

  return objective
}
