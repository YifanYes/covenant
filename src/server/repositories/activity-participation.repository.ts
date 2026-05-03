import type { ActivityParticipation, PrismaClient } from '@/generated/prisma'
import type { ActiveStatusEffect } from '@shared/types/doctrine.types'
import type { TacticalStateData } from '@shared/types/tactical-combat.types'

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

  async findByIdWithTacticalState(participationId: string): Promise<{
    id: string
    characterId: string
    tacticalState: TacticalStateData | null
  } | null> {
    const result = await this.prisma.activityParticipation.findUnique({
      where: { id: participationId },
      select: { id: true, characterId: true, tacticalState: true }
    })

    if (!result) return null

    return {
      id: result.id,
      characterId: result.characterId,
      tacticalState: result.tacticalState as unknown as TacticalStateData | null
    }
  }

  async updateTacticalState(participationId: string, tacticalState: TacticalStateData): Promise<void> {
    await this.prisma.activityParticipation.update({
      where: { id: participationId },
      data: { tacticalState: tacticalState as any }
    })
  }

  async verifyOwnership(participationId: string, userId: string): Promise<boolean> {
    const participation = await this.prisma.activityParticipation.findUnique({
      where: { id: participationId },
      include: { character: { select: { userId: true } } }
    })

    return participation?.character?.userId === userId
  }

  async findByIdWithActivity(participationId: string): Promise<{
    id: string
    activityId: string
    characterId: string
  } | null> {
    const result = await this.prisma.activityParticipation.findUnique({
      where: { id: participationId },
      select: { id: true, activityId: true, characterId: true }
    })

    return result
  }

  async findActiveByCharacterId(characterId: string): Promise<{
    id: string
    characterId: string
    tacticalState: TacticalStateData | null
  } | null> {
    const result = await this.prisma.activityParticipation.findFirst({
      where: { characterId },
      select: { id: true, characterId: true, tacticalState: true }
    })

    if (!result) return null

    return {
      id: result.id,
      characterId: result.characterId,
      tacticalState: result.tacticalState as unknown as TacticalStateData | null
    }
  }

  async findByCharacterAndActivity(
    characterId: string,
    activityId: string
  ): Promise<{
    id: string
    tacticalState: TacticalStateData | null
  } | null> {
    const result = await this.prisma.activityParticipation.findFirst({
      where: { characterId, activityId },
      select: { id: true, tacticalState: true }
    })

    if (!result) return null

    return {
      id: result.id,
      tacticalState: result.tacticalState as unknown as TacticalStateData | null
    }
  }

  async updateCombatStats<T extends object>(participationId: string, combatStats: T): Promise<void> {
    await this.prisma.activityParticipation.update({
      where: { id: participationId },
      data: { combatStats: combatStats as any }
    })
  }

  async getCombatStats<T>(participationId: string): Promise<T | null> {
    const result = await this.prisma.activityParticipation.findUnique({
      where: { id: participationId },
      select: { combatStats: true }
    })

    return result?.combatStats as T | null
  }
}
