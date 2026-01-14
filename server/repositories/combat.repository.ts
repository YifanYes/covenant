import type { CombatLogEntry, EnemyState } from '@shared/types/gamification.types'
import { MissionStatus } from '@shared/types/gamification.types'
import type { PrismaClient } from '../generated/prisma'

export class CombatRepository {
  constructor(private prisma: PrismaClient) {}

  async saveTurnResults(
    missionId: string,
    characterId: string,
    classId: string,
    updates: {
      enemyState: EnemyState[]
      combatLog: CombatLogEntry[]
      missionStatus?: MissionStatus
      missionCompletedAt?: Date
      characterData: any
      diceBank: number
      health: number
      mana: number
    }
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.mission.update({
        where: { id: missionId },
        data: {
          enemyState: updates.enemyState as any,
          combatLog: updates.combatLog as any,
          ...(updates.missionStatus && { status: updates.missionStatus }),
          ...(updates.missionCompletedAt && { completedAt: updates.missionCompletedAt })
        }
      }),
      this.prisma.character.update({
        where: { id: characterId },
        data: {
          data: { ...updates.characterData, diceBank: updates.diceBank }
        }
      }),
      this.prisma.characterClass.update({
        where: { id: classId },
        data: {
          health: updates.health,
          mana: updates.mana
        }
      })
    ])
  }
}
