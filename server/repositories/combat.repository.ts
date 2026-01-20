import type { EnemyState } from '@shared/types/gamification.types'
import type { PrismaClient } from '../generated/prisma'

/**
 * CombatRepository handles persistence of combat-related data.
 * Note: The old mission-based combat system was removed. This repository
 * is now a placeholder for future Activity-based combat persistence.
 */
export class CombatRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Save combat turn results to the database.
   * @deprecated This method was used with the old Mission system.
   * Use ActivityRepository for the new Map Activities combat flow.
   */
  async saveTurnResults(
    _activityId: string,
    characterId: string,
    classId: string,
    updates: {
      enemyState: EnemyState[]
      characterData: Record<string, unknown>
      diceBank: number
      health: number
      mana: number
    }
  ): Promise<void> {
    await this.prisma.$transaction([
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
