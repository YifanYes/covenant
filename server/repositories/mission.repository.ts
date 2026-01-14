import type { CombatLogEntry, EnemyState } from '@shared/types/gamification.types'
import { MissionStatus } from '@shared/types/gamification.types'
import { TRPCError } from '@trpc/server'
import { type Mission, type PrismaClient } from '../generated/prisma'

export interface CreateMissionData {
  partyId: string
  name: string
  description: string
  requiredTier: number
  enemyState: EnemyState[]
  rewards: unknown
}

export class MissionRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<Mission | null> {
    return this.prisma.mission.findUnique({
      where: { id }
    })
  }

  async findByIdOrThrow(id: string): Promise<Mission> {
    const mission = await this.findById(id)
    if (!mission) {
      throw new TRPCError({ code: 'NOT_FOUND', message: `Mission ${id} not found` })
    }

    return mission
  }

  async findActiveByPartyId(currentMissionId: string | null): Promise<Mission | null> {
    if (!currentMissionId) return null

    return this.prisma.mission.findUnique({
      where: { id: currentMissionId }
    })
  }

  async findActiveOrThrow(currentMissionId: string | null): Promise<Mission> {
    if (!currentMissionId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'No active mission' })
    }

    const mission = await this.findById(currentMissionId)
    if (!mission) {
      throw new TRPCError({ code: 'NOT_FOUND', message: `Mission ${currentMissionId} not found` })
    }

    return mission
  }

  async create(data: CreateMissionData): Promise<Mission> {
    return this.prisma.mission.create({
      data: {
        partyId: data.partyId,
        name: data.name,
        description: data.description,
        requiredTier: data.requiredTier,
        status: MissionStatus.ACTIVE,
        currentPhase: 0,
        enemyState: data.enemyState as any,
        combatLog: [],
        rewards: data.rewards as any
      }
    })
  }

  async updateCombatState(
    id: string,
    enemyState: EnemyState[],
    combatLog: CombatLogEntry[],
    additionalData?: { status?: MissionStatus; completedAt?: Date }
  ): Promise<void> {
    await this.prisma.mission.update({
      where: { id },
      data: {
        enemyState: enemyState as any,
        combatLog: combatLog as any,
        ...additionalData
      }
    })
  }

  async updatePhase(
    id: string,
    newPhase: number,
    newEnemyState: EnemyState[],
    combatLog: CombatLogEntry[]
  ): Promise<void> {
    await this.prisma.mission.update({
      where: { id },
      data: {
        currentPhase: newPhase,
        enemyState: newEnemyState as any,
        combatLog: combatLog as any
      }
    })
  }

  async complete(
    id: string,
    partyId: string,
    classId: string,
    characterId: string,
    updates: {
      newTier: number
      missionProgress: any
      goldReward: number
      currentGold: number
    }
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.mission.update({
        where: { id },
        data: { status: MissionStatus.COMPLETED, completedAt: new Date() }
      }),
      this.prisma.party.update({
        where: { id: partyId },
        data: { currentMissionId: null }
      }),
      this.prisma.characterClass.update({
        where: { id: classId },
        data: {
          tier: updates.newTier,
          missionProgress: updates.missionProgress
        }
      }),
      this.prisma.character.update({
        where: { id: characterId },
        data: { gold: updates.currentGold + updates.goldReward }
      })
    ])
  }

  async fail(id: string): Promise<void> {
    await this.prisma.mission.update({
      where: { id },
      data: { status: MissionStatus.FAILED, completedAt: new Date() }
    })
  }

  async findCompletedByPartyId(partyId: string): Promise<Mission[]> {
    return this.prisma.mission.findMany({
      where: {
        partyId,
        status: { in: [MissionStatus.COMPLETED, MissionStatus.FAILED] }
      },
      orderBy: { completedAt: 'desc' }
    })
  }
}
