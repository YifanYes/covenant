import type { PrismaClient } from '@/generated/prisma'
import type { QuestStatus } from '@/shared/constants/quests.constants'
import type { ActiveStatusEffect } from '@shared/types/ability.types'
import { parseTacticalState, type TacticalStateData } from '@shared/types/tactical-combat.types'
import { generatePublicId } from '../lib/public-id'

export class CharacterQuestRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: bigint) {
    return this.prisma.characterQuest.findUnique({ where: { id } })
  }

  async findByPublicId(publicId: string) {
    return this.prisma.characterQuest.findUnique({ where: { publicId } })
  }

  async findActiveByCharacterId(characterId: bigint): Promise<{
    id: bigint
    characterId: bigint
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
      tacticalState: parseTacticalState(result.tacticalState)
    }
  }

  async findByIdWithTacticalState(id: bigint): Promise<{
    id: bigint
    characterId: bigint
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
      tacticalState: parseTacticalState(result.tacticalState)
    }
  }

  async findByIdWithAbilities(id: bigint): Promise<{
    id: bigint
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

  async create(characterId: bigint, questId: string, target: number) {
    return this.prisma.characterQuest.create({
      data: {
        publicId: generatePublicId(),
        characterId,
        questId,
        status: 'ACTIVE' satisfies QuestStatus,
        target,
        progress: 0,
        goldEarned: 0
      }
    })
  }

  async updateProgress(id: bigint, killDelta: number, goldDelta: number): Promise<void> {
    await this.prisma.characterQuest.update({
      where: { id },
      data: {
        progress: { increment: killDelta },
        goldEarned: { increment: goldDelta }
      }
    })
  }

  async complete(id: bigint): Promise<void> {
    await this.prisma.characterQuest.update({
      where: { id },
      data: { status: 'COMPLETED' satisfies QuestStatus, completedAt: new Date() }
    })
  }

  async abandon(id: bigint): Promise<void> {
    await this.prisma.characterQuest.update({
      where: { id },
      data: { status: 'ABANDONED' satisfies QuestStatus }
    })
  }

  async updateTacticalState(id: bigint, tacticalState: TacticalStateData): Promise<void> {
    await this.prisma.characterQuest.update({
      where: { id },
      data: { tacticalState: tacticalState as unknown as object }
    })
  }

  async updateAbilities(
    id: bigint,
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

  async updateActiveAbilities(id: bigint, activeAbilities: Record<string, ActiveStatusEffect>): Promise<void> {
    await this.prisma.characterQuest.update({
      where: { id },
      data: { activeAbilities: activeAbilities as unknown as object }
    })
  }

  async updateCombatStats<T extends object>(id: bigint, combatStats: T): Promise<void> {
    await this.prisma.characterQuest.update({
      where: { id },
      data: { combatStats: combatStats as unknown as object }
    })
  }

  async getCombatStats<T>(id: bigint): Promise<T | null> {
    const result = await this.prisma.characterQuest.findUnique({
      where: { id },
      select: { combatStats: true }
    })

    return result?.combatStats as T | null
  }

  async verifyOwnership(id: bigint, userId: string): Promise<boolean> {
    const quest = await this.prisma.characterQuest.findUnique({
      where: { id },
      include: { character: { select: { userId: true } } }
    })

    return quest?.character?.userId === userId
  }
}
