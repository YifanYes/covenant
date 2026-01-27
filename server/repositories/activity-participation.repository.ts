import type { ActiveStatusEffect } from '@shared/types/doctrine.types'
import type { ActivityParticipation, PrismaClient } from '../generated/prisma'

export class ActivityParticipationRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(participationId: string): Promise<ActivityParticipation | null> {
    return this.prisma.activityParticipation.findUnique({
      where: { id: participationId }
    })
  }

  async findByIdWithDoctrines(participationId: string): Promise<{
    id: string
    activeDoctrines: Record<string, ActiveStatusEffect> | null
    enemyActiveDoctrines: Record<string, ActiveStatusEffect> | null
  } | null> {
    const result = await this.prisma.activityParticipation.findUnique({
      where: { id: participationId },
      select: { id: true, activeDoctrines: true, enemyActiveDoctrines: true }
    })

    if (!result) return null

    return {
      id: result.id,
      activeDoctrines: result.activeDoctrines as unknown as Record<string, ActiveStatusEffect> | null,
      enemyActiveDoctrines: result.enemyActiveDoctrines as unknown as Record<string, ActiveStatusEffect> | null
    }
  }

  async updateDoctrines(
    participationId: string,
    activeDoctrines: Record<string, ActiveStatusEffect>,
    enemyActiveDoctrines: Record<string, ActiveStatusEffect>
  ): Promise<void> {
    await this.prisma.activityParticipation.update({
      where: { id: participationId },
      data: {
        activeDoctrines: activeDoctrines as any,
        enemyActiveDoctrines: enemyActiveDoctrines as any
      }
    })
  }

  async updateActiveDoctrines(
    participationId: string,
    activeDoctrines: Record<string, ActiveStatusEffect>
  ): Promise<void> {
    await this.prisma.activityParticipation.update({
      where: { id: participationId },
      data: { activeDoctrines: activeDoctrines as any }
    })
  }
}
