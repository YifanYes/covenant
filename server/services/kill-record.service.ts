import type { CharacterRepository } from '../repositories/character.repository'
import type { CombatEnemyRepository } from '../repositories/combat-enemy.repository'

export class KillRecordService {
  constructor(
    private characterRepository: CharacterRepository,
    private combatEnemyRepository: CombatEnemyRepository
  ) {}

  async getKillRecord(userId: string, limit = 50, cursor?: string) {
    const character = await this.characterRepository.findByUserId(userId)

    if (!character) {
      return { enemies: [], nextCursor: undefined }
    }

    const enemies = await this.combatEnemyRepository.getDefeatedEnemiesByCharacter(character.id, limit + 1, cursor)

    const hasMore = enemies.length > limit
    const nextCursor = hasMore ? enemies[limit - 1].id : undefined

    return {
      enemies: enemies.slice(0, limit),
      nextCursor
    }
  }

  async getKillStats(userId: string) {
    const character = await this.characterRepository.findByUserId(userId)

    if (!character) {
      return {
        totalKills: 0,
        totalDamageDealt: 0,
        totalDamageTaken: 0,
        totalCriticalHits: 0
      }
    }

    return this.combatEnemyRepository.getKillStats(character.id)
  }
}
