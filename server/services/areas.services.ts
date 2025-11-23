import { TRPCError } from '@trpc/server'
import { type Area, type PrismaClient } from '../generated/prisma/client'

export const getUserArea = async (prisma: PrismaClient, areaId: string, userId: string): Promise<Area> => {
  const area = await prisma.area.findFirst({
    where: {
      id: areaId,
      userId: userId
    }
  })

  if (!area) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Area not found'
    })
  }

  return area
}
