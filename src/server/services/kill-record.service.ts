import { CharacterClassName, calculateMaxStats } from '@/shared/constants/classes.constants'
import {
  calculateTierFromKills,
  getTierProgress,
  type TierProgressInfo
} from '@/shared/constants/tier-progression.constants'
import { TRPCError } from '@trpc/server'
import type { CharacterRepository } from '../repositories/character.repository'
import type { CombatEnemyRepository } from '../repositories/combat-enemy.repository'

export interface TierProgressionResult {
  tierChanged: boolean
  oldTier: number
  newTier: number
}

export interface TierProgressInfoResponse {
  currentTier: number
  progress: TierProgressInfo | null
}

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

  /**
   * Check if the user has earned a tier-up based on total kills and apply it
   */
  async checkAndApplyTierProgression(userId: string): Promise<TierProgressionResult> {
    const character = await this.characterRepository.findWithClasses(userId)
    if (!character) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Character not found'
      })
    }

    return this.applyTierProgressionForCharacter(character)
  }

  /**
   * Check if the character has earned a tier-up based on total kills and apply it
   * Used internally when we have characterId instead of userId
   */
  async checkAndApplyTierProgressionByCharacterId(characterId: string): Promise<TierProgressionResult> {
    const character = await this.characterRepository.findByIdWithClasses(characterId)
    if (!character) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Character not found'
      })
    }

    return this.applyTierProgressionForCharacter(character)
  }

  private async applyTierProgressionForCharacter(
    character: NonNullable<Awaited<ReturnType<typeof this.characterRepository.findWithClasses>>>
  ): Promise<TierProgressionResult> {
    const currentClass = character.classes.find((c) => c.className === character.currentClass)
    if (!currentClass) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Current class ${character.currentClass} not found for character ${character.id}`
      })
    }

    const stats = await this.combatEnemyRepository.getKillStats(character.id)
    const oldTier = currentClass.tier
    const newTier = calculateTierFromKills(stats.totalKills, oldTier)

    if (newTier > oldTier) {
      const { maxHealth, maxMana } = calculateMaxStats(character.currentClass as CharacterClassName, newTier)
      await this.characterRepository.updateProgress(currentClass.id, newTier, maxHealth, maxMana)
      return { tierChanged: true, oldTier, newTier }
    }

    return { tierChanged: false, oldTier, newTier: oldTier }
  }

  /**
   * Get tier progress info for displaying in the UI
   */
  async getTierProgressInfo(userId: string): Promise<TierProgressInfoResponse> {
    const character = await this.characterRepository.findWithClasses(userId)
    if (!character) {
      return { currentTier: 1, progress: null }
    }

    const currentClass = character.classes.find((c) => c.className === character.currentClass)
    if (!currentClass) {
      return { currentTier: 1, progress: null }
    }

    const stats = await this.combatEnemyRepository.getKillStats(character.id)
    const progress = getTierProgress(stats.totalKills, currentClass.tier)

    return { currentTier: currentClass.tier, progress }
  }
}
