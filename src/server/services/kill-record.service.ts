import { CharacterClassName, calculateMaxStats } from '@/shared/constants/classes.constants'
import {
  calculateTierFromKills,
  getTierProgress,
  type TierProgressInfo
} from '@/shared/constants/tier-progression.constants'
import { TRPCError } from '@trpc/server'
import { resourceNotFound } from '../lib/errors'
import { logger } from '../lib/logger'
import type { CharacterRepository } from '../repositories/character.repository'
import type { CombatEnemyRepository } from '../repositories/combat-enemy.repository'

const log = logger.child({ service: 'kill-record' })

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

  async getKillRecord(userId: string, limit = 50, cursorPublicId?: string) {
    const character = await this.characterRepository.findByUserId(userId)

    if (!character) {
      return { enemies: [], nextCursor: undefined }
    }

    let cursorId: bigint | undefined
    if (cursorPublicId) {
      const found = await this.combatEnemyRepository.findByPublicId(cursorPublicId)
      cursorId = found?.id
    }

    const enemies = await this.combatEnemyRepository.getDefeatedEnemiesByCharacter(character.id, limit + 1, cursorId)

    const hasMore = enemies.length > limit
    const nextCursor = hasMore ? enemies[limit - 1].publicId : undefined

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
      log.warn({ userId }, 'checkAndApplyTierProgression: character not found')
      throw resourceNotFound()
    }

    return this.applyTierProgressionForCharacter(character)
  }

  /**
   * Check if the character has earned a tier-up based on total kills and apply it
   * Used internally when we have characterId instead of userId
   */
  async checkAndApplyTierProgressionByCharacterId(characterId: bigint): Promise<TierProgressionResult> {
    const character = await this.characterRepository.findByIdWithClasses(characterId)
    if (!character) {
      log.warn({ characterId }, 'checkAndApplyTierProgressionByCharacterId: character not found')
      throw resourceNotFound()
    }

    return this.applyTierProgressionForCharacter(character)
  }

  private async applyTierProgressionForCharacter(
    character: NonNullable<Awaited<ReturnType<typeof this.characterRepository.findWithClasses>>>
  ): Promise<TierProgressionResult> {
    const currentClass = character.classes.find((c) => c.className === character.currentClass)
    if (!currentClass) {
      log.error(
        { characterId: character.id, currentClass: character.currentClass },
        'applyTierProgressionForCharacter: current class not found (data integrity)'
      )
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Current class not found'
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
