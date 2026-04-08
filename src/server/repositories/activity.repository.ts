import { ActivityStatus, CombatEnemyStatus } from '@shared/types/gamification.types'
import { type PrismaClient } from '@/generated/prisma'

export class ActivityRepository {
  constructor(private prisma: PrismaClient) {}

  async getActiveActivities() {
    return this.prisma.mapActivity.findMany({
      where: {
        status: ActivityStatus.ACTIVE
      },
      include: {
        participations: {
          include: {
            enemies: {
              where: { status: CombatEnemyStatus.ACTIVE },
              take: 1
            }
          }
        }
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
        participations: {
          include: {
            enemies: true
          }
        }
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
        participations: {
          include: {
            enemies: true
          }
        }
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
        participations: {
          include: {
            enemies: true
          }
        }
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
      },
      include: {
        enemies: {
          where: { status: CombatEnemyStatus.ACTIVE },
          take: 1
        }
      }
    })
  }

  async getParticipationWithAllEnemies(activityId: string, characterId: string) {
    return this.prisma.activityParticipation.findUnique({
      where: {
        activityId_characterId: {
          activityId,
          characterId
        }
      },
      include: {
        enemies: {
          orderBy: { spawnedAt: 'desc' }
        }
      }
    })
  }

  async createParticipation(activityId: string, characterId: string) {
    return this.prisma.activityParticipation.create({
      data: {
        activityId,
        characterId
      },
      include: {
        enemies: true
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

  async updateParticipationStats(
    participationId: string,
    goldReward: number = 0,
    combatStats?: Record<string, number>
  ) {
    return this.prisma.activityParticipation.update({
      where: { id: participationId },
      data: {
        goldEarned: { increment: goldReward },
        lastCombatAt: new Date(),
        combatStats: combatStats || undefined
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

  async findExpiredActivities(before: Date) {
    return this.prisma.mapActivity.findMany({
      where: {
        status: ActivityStatus.ACTIVE,
        deadline: { lt: before }
      },
      include: {
        participations: true
      }
    })
  }

  async failActivity(activityId: string) {
    return this.prisma.mapActivity.update({
      where: { id: activityId },
      data: {
        status: ActivityStatus.FAILED,
        completedAt: new Date()
      }
    })
  }
}
