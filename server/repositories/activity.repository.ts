import { ActivityStatus } from '@shared/types/gamification.types'
import { type PrismaClient } from '../generated/prisma'

export class ActivityRepository {
  constructor(private prisma: PrismaClient) {}

  async getActiveActivities() {
    return this.prisma.mapActivity.findMany({
      where: {
        status: ActivityStatus.ACTIVE
      },
      include: {
        participations: true
      }
    })
  }

  async countActiveCharacters() {
    return this.prisma.character.count()
  }

  async getActivityById(id: string) {
    return this.prisma.mapActivity.findUnique({
      where: { id },
      include: {
        participations: true
      }
    })
  }

  async getActivityByTemplateId(activityId: string) {
    return this.prisma.mapActivity.findFirst({
      where: {
        activityId,
        status: ActivityStatus.ACTIVE
      },
      include: {
        participations: true
      }
    })
  }

  async getActivityIdByTemplateId(activityId: string) {
    const activity = await this.prisma.mapActivity.findFirst({
      where: {
        activityId,
        status: ActivityStatus.ACTIVE
      },
      select: {
        id: true
      }
    })
    return activity?.id
  }

  async createActivity(activityId: string, target: number, durationDays: number) {
    const deadline = new Date()
    deadline.setDate(deadline.getDate() + durationDays)

    return this.prisma.mapActivity.create({
      data: {
        activityId,
        status: ActivityStatus.ACTIVE,
        target,
        deadline
      },
      include: {
        participations: true
      }
    })
  }

  async getOrCreateActivity(activityId: string, target: number, durationDays: number) {
    const existing = await this.getActivityByTemplateId(activityId)
    if (existing) return existing
    return this.createActivity(activityId, target, durationDays)
  }

  async getParticipation(activityId: string, characterId: string) {
    return this.prisma.activityParticipation.findUnique({
      where: {
        activityId_characterId: {
          activityId,
          characterId
        }
      }
    })
  }

  async createParticipation(
    activityId: string,
    characterId: string,
    initialState?: { currentEnemyId: string; currentEnemyHealth: number; currentEnemyMaxHealth: number }
  ) {
    return this.prisma.activityParticipation.create({
      data: {
        activityId,
        characterId,
        currentEnemyId: initialState?.currentEnemyId,
        currentEnemyHealth: initialState?.currentEnemyHealth,
        currentEnemyMaxHealth: initialState?.currentEnemyMaxHealth
      }
    })
  }

  async updateProgress(activityId: string, killsToAdd: number) {
    return this.prisma.mapActivity.update({
      where: { id: activityId },
      data: {
        progress: {
          increment: killsToAdd
        }
      }
    })
  }

  async updateParticipation(participationId: string, kills: number, gold: number) {
    return this.prisma.activityParticipation.update({
      where: { id: participationId },
      data: {
        kills: { increment: kills },
        goldEarned: { increment: gold },
        lastCombatAt: new Date()
      }
    })
  }

  async updateParticipationState(
    participationId: string,
    state: { currentEnemyId?: string | null; currentEnemyHealth?: number; currentEnemyMaxHealth?: number },
    goldReward: number = 0,
    combatLog?: any[]
  ) {
    return this.prisma.activityParticipation.update({
      where: { id: participationId },
      data: {
        currentEnemyId: state.currentEnemyId,
        currentEnemyHealth: state.currentEnemyHealth,
        currentEnemyMaxHealth: state.currentEnemyMaxHealth,
        goldEarned: { increment: goldReward },
        lastCombatAt: new Date(),
        combatLog: combatLog || undefined
      }
    })
  }

  async completeActivity(activityId: string) {
    return this.prisma.mapActivity.update({
      where: { id: activityId },
      data: {
        status: ActivityStatus.COMPLETED,
        completedAt: new Date()
      }
    })
  }
}
