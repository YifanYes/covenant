import { Prisma, type PrismaClient } from '@/generated/prisma'
import { CombatEnemyStatus } from '@shared/types/gamification.types'

export class CombatEnemyRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string) {
    return this.prisma.combatEnemy.findUnique({
      where: { id }
    })
  }

  async getActiveEnemy(characterQuestId: string) {
    return this.prisma.combatEnemy.findFirst({
      where: {
        characterQuestId,
        status: CombatEnemyStatus.ACTIVE
      }
    })
  }

  async getEnemiesByQuest(characterQuestId: string) {
    return this.prisma.combatEnemy.findMany({
      where: { characterQuestId },
      orderBy: { spawnedAt: 'desc' }
    })
  }

  async getDefeatedEnemies(characterQuestId: string) {
    return this.prisma.combatEnemy.findMany({
      where: {
        characterQuestId,
        status: CombatEnemyStatus.DEFEATED
      },
      orderBy: { defeatedAt: 'desc' }
    })
  }

  async createEnemy(data: {
    characterQuestId: string
    templateId: string
    namePrefix: string
    nameSuffix: string
    maxHealth: number
    currentHealth: number
  }) {
    return this.prisma.combatEnemy.create({
      data: {
        characterQuestId: data.characterQuestId,
        templateId: data.templateId,
        namePrefix: data.namePrefix,
        nameSuffix: data.nameSuffix,
        maxHealth: data.maxHealth,
        currentHealth: data.currentHealth,
        status: CombatEnemyStatus.ACTIVE,
        combatLog: []
      }
    })
  }

  async updateEnemy(
    enemyId: string,
    data: {
      currentHealth?: number
      turnsElapsed?: number
      damageDealt?: number
      damageTaken?: number
      criticalHits?: number
      combatLog?: unknown[]
    }
  ) {
    const updateData: Record<string, unknown> = {}

    if (data.currentHealth !== undefined) {
      updateData.currentHealth = data.currentHealth
    }
    if (data.turnsElapsed !== undefined) {
      updateData.turnsElapsed = { increment: data.turnsElapsed }
    }
    if (data.damageDealt !== undefined) {
      updateData.damageDealt = { increment: data.damageDealt }
    }
    if (data.damageTaken !== undefined) {
      updateData.damageTaken = { increment: data.damageTaken }
    }
    if (data.criticalHits !== undefined) {
      updateData.criticalHits = { increment: data.criticalHits }
    }
    if (data.combatLog !== undefined) {
      updateData.combatLog = data.combatLog as Prisma.InputJsonValue
    }

    return this.prisma.combatEnemy.update({
      where: { id: enemyId },
      data: updateData
    })
  }

  async defeatEnemy(enemyId: string) {
    return this.prisma.combatEnemy.update({
      where: { id: enemyId },
      data: {
        status: CombatEnemyStatus.DEFEATED,
        defeatedAt: new Date(),
        currentHealth: 0
      }
    })
  }

  async appendToCombatLog(enemyId: string, entries: unknown[]) {
    const enemy = await this.prisma.combatEnemy.findUnique({
      where: { id: enemyId },
      select: { combatLog: true }
    })

    const existingLog = (enemy?.combatLog as unknown[]) || []
    const MAX_LOG_ENTRIES = 50
    const updatedLog = [...entries, ...existingLog].slice(0, MAX_LOG_ENTRIES)

    return this.prisma.combatEnemy.update({
      where: { id: enemyId },
      data: { combatLog: updatedLog as Prisma.InputJsonValue }
    })
  }

  async getDefeatedEnemiesByCharacter(characterId: string, limit = 50, cursor?: string) {
    return this.prisma.combatEnemy.findMany({
      where: {
        characterQuest: {
          characterId
        },
        status: CombatEnemyStatus.DEFEATED
      },
      orderBy: { defeatedAt: 'desc' },
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {})
    })
  }

  async getKillStats(characterId: string) {
    const result = await this.prisma.combatEnemy.aggregate({
      where: {
        characterQuest: {
          characterId
        },
        status: CombatEnemyStatus.DEFEATED
      },
      _count: { id: true },
      _sum: {
        damageDealt: true,
        damageTaken: true,
        criticalHits: true
      }
    })

    return {
      totalKills: result._count.id,
      totalDamageDealt: result._sum.damageDealt ?? 0,
      totalDamageTaken: result._sum.damageTaken ?? 0,
      totalCriticalHits: result._sum.criticalHits ?? 0
    }
  }
}
