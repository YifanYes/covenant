import type { PrismaClient } from '@/generated/prisma'
import type { ActiveStatusEffect } from '@shared/types/ability.types'
import type { QuestStatus } from '@shared/constants/quests'
import type { TacticalStateData } from '@shared/types/tactical-combat.types'

export class CharacterQuestRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string) {
    return this.prisma.characterQuest.findUnique({ where: { id } })
  }

  async findActiveByCharacterId(characterId: string): Promise<{
    id: string
    characterId: string
    questId: string
    status: string
    progress: number
    target: number
    goldEarned: number
    tacticalState: TacticalStateData | null
  } | null> {
    const result = await this.prisma.characterQuest.findFirst({
      where: { characterId, status: 'ACTIVE' },
      select: {
        id: true,
        characterId: true,
        questId: true,
        status: true,
        progress: true,
        target: true,
        goldEarned: true,
        tacticalState: true
      }
    })

    if (!result) return null

    return {
      id: result.id,
      characterId: result.characterId,
      questId: result.questId,
      status: result.status,
      progress: result.progress,
      target: result.target,
      goldEarned: result.goldEarned,
      tacticalState: result.tacticalState as unknown as TacticalStateData | null
    }
  }

  async findByIdWithTacticalState(id: string): Promise<{
    id: string
    characterId: string
    tacticalState: TacticalStateData | null
  } | null> {
    const result = await this.prisma.characterQuest.findUnique({
      where: { id },
      select: { id: true, characterId: true, tacticalState: true }
    })

    if (!result) return null

    return {
      id: result.id,
      characterId: result.characterId,
      tacticalState: result.tacticalState as unknown as TacticalStateData | null
    }
  }

  async findByIdWithAbilities(id: string): Promise<{
    id: string
    activeAbilities: Record<string, ActiveStatusEffect> | null
    enemyActiveAbilities: Record<string, ActiveStatusEffect> | null
  } | null> {
    const result = await this.prisma.characterQuest.findUnique({
      where: { id },
      select: { id: true, activeAbilities: true, enemyActiveAbilities: true }
    })

    if (!result) return null

    return {
      id: result.id,
      activeAbilities: result.activeAbilities as unknown as Record<string, ActiveStatusEffect> | null,
      enemyActiveAbilities: result.enemyActiveAbilities as unknown as Record<string, ActiveStatusEffect> | null
    }
  }

  async create(characterId: string, questId: string, target: number) {
    return this.prisma.characterQuest.create({
      data: {
        characterId,
        questId,
        status: 'ACTIVE' satisfies QuestStatus,
        target,
        progress: 0,
        goldEarned: 0
      }
    })
  }

  async updateProgress(id: string, killDelta: number, goldDelta: number): Promise<void> {
    await this.prisma.characterQuest.update({
      where: { id },
      data: {
        progress: { increment: killDelta },
        goldEarned: { increment: goldDelta }
      }
    })
  }

  async complete(id: string): Promise<void> {
    await this.prisma.characterQuest.update({
      where: { id },
      data: { status: 'COMPLETED' satisfies QuestStatus, completedAt: new Date() }
    })
  }

  async abandon(id: string): Promise<void> {
    await this.prisma.characterQuest.update({
      where: { id },
      data: { status: 'ABANDONED' satisfies QuestStatus }
    })
  }

  async updateTacticalState(id: string, tacticalState: TacticalStateData): Promise<void> {
    await this.prisma.characterQuest.update({
      where: { id },
      data: { tacticalState: tacticalState as unknown as object }
    })
  }

  async updateAbilities(
    id: string,
    activeAbilities: Record<string, ActiveStatusEffect>,
    enemyActiveAbilities: Record<string, ActiveStatusEffect>
  ): Promise<void> {
    await this.prisma.characterQuest.update({
      where: { id },
      data: {
        activeAbilities: activeAbilities as unknown as object,
        enemyActiveAbilities: enemyActiveAbilities as unknown as object
      }
    })
  }

  async updateActiveAbilities(id: string, activeAbilities: Record<string, ActiveStatusEffect>): Promise<void> {
    await this.prisma.characterQuest.update({
      where: { id },
      data: { activeAbilities: activeAbilities as unknown as object }
    })
  }

  async updateCombatStats<T extends object>(id: string, combatStats: T): Promise<void> {
    await this.prisma.characterQuest.update({
      where: { id },
      data: { combatStats: combatStats as unknown as object }
    })
  }

  async getCombatStats<T>(id: string): Promise<T | null> {
    const result = await this.prisma.characterQuest.findUnique({
      where: { id },
      select: { combatStats: true }
    })

    return result?.combatStats as T | null
  }

  async verifyOwnership(id: string, userId: string): Promise<boolean> {
    const quest = await this.prisma.characterQuest.findUnique({
      where: { id },
      include: { character: { select: { userId: true } } }
    })

    return quest?.character?.userId === userId
  }
}
