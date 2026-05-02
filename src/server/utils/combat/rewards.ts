import { getActivityById, selectEnemyWithFallback } from '@shared/constants/activities'
import { applyStatScaling, calculateGoldReward, getEnemy } from '@shared/constants/enemies'
import { generateEnemyNameKeys } from '@shared/constants/enemy-names'
import { generateEncounterSequence, getNextEncounterSlot } from '@shared/constants/encounter-patterns'
import type { MaterialDrop } from '@shared/constants/drop-tables'
import type { EncounterState } from '@shared/types/combat.types'
import {
  TACTICAL_STATE_VERSION,
  type TacticalStateData,
  type TacticalUnitState
} from '@shared/types/tactical-combat.types'
import type { ActivityParticipationRepository } from '../../repositories/activity-participation.repository'
import type { ActivityRepository } from '../../repositories/activity.repository'
import type { CharacterRepository } from '../../repositories/character.repository'
import type { CombatEnemyRepository } from '../../repositories/combat-enemy.repository'
import type { KillRecordService } from '../../services/kill-record.service'

/** Minimal repo set used by functions that only read/write combat state (no reward processing). */
export interface CombatStateRepos {
  characterRepository: CharacterRepository
  activityParticipationRepository: ActivityParticipationRepository
  combatEnemyRepository?: CombatEnemyRepository
}

/** Extended repo set for functions that also process rewards, gold, and tier progression. */
export interface CombatRewardDeps extends CombatStateRepos {
  activityRepository?: ActivityRepository
  killRecordService?: KillRecordService
}

/** @deprecated Use CombatStateRepos or CombatRewardDeps instead. */
export type CombatRepos = CombatRewardDeps

export interface EnemyDefeatResult {
  goldReward: number
  materialDrops: MaterialDrop[]
  nextEnemy?: {
    id: string
    templateId: string
    name: string
    currentHealth: number
    maxHealth: number
  }
  tierProgression?: { oldTier: number; newTier: number }
}

/**
 * Process enemy defeat: award gold, materials, check tier progression, spawn next enemy.
 * Unified logic extracted from executeTacticalAttack and executeTacticalDoctrine.
 */
export async function processEnemyDefeat(
  participationId: string,
  updatedState: TacticalStateData,
  killedEnemyIds: string[],
  repos: CombatRewardDeps
): Promise<EnemyDefeatResult> {
  const result: EnemyDefeatResult = {
    goldReward: 0,
    materialDrops: []
  }

  if (killedEnemyIds.length === 0 || !repos.combatEnemyRepository) {
    return result
  }

  let activeEnemy = await repos.combatEnemyRepository.getActiveEnemy(participationId)

  // Fallback: if no active enemy found by status, try finding by ID from tactical state
  if (!activeEnemy) {
    const enemyUnit = updatedState.units.find((u) => !u.id.startsWith('player-'))
    if (enemyUnit) {
      activeEnemy = await repos.combatEnemyRepository.findById(enemyUnit.id)
    }
  }

  if (!activeEnemy) return result

  // Mark enemy as defeated
  await repos.combatEnemyRepository.defeatEnemy(activeEnemy.id)

  // Get enemy template for gold calculation
  const enemyTemplate = getEnemy(activeEnemy.templateId)
  if (enemyTemplate) {
    result.goldReward = calculateGoldReward(enemyTemplate)
  }

  if (!repos.activityRepository) return result

  // Update participation stats (kills, gold)
  await repos.activityRepository.updateParticipation(participationId, 1, result.goldReward)

  // Get participation to find the activity
  const participation = await repos.activityParticipationRepository.findByIdWithActivity(participationId)

  // Add gold to character's balance
  if (participation?.characterId && result.goldReward > 0) {
    await repos.characterRepository.addGold(participation.characterId, result.goldReward)
  }

  // Check tier progression after enemy defeat
  if (participation?.characterId && repos.killRecordService) {
    const tierResult = await repos.killRecordService.checkAndApplyTierProgressionByCharacterId(
      participation.characterId
    )
    if (tierResult.tierChanged) {
      result.tierProgression = { oldTier: tierResult.oldTier, newTier: tierResult.newTier }
    }
  }

  if (participation?.activityId) {
    // Update activity progress
    await repos.activityRepository.updateProgress(participation.activityId, 1)

    // Get activity config to spawn next enemy
    const activity = await repos.activityRepository.getActivityById(participation.activityId)
    if (activity) {
      const config = getActivityById(activity.activityId)

      // Check if activity is complete (progress was already incremented by updateProgress)
      const isActivityCompleted = activity.progress >= activity.target

      if (!isActivityCompleted && config) {
        // Get character tier for encounter system
        const character = await repos.characterRepository.findByIdWithClasses(participation.characterId)
        const currentClass = character?.classes.find((c) => c.className === character.currentClass)
        const characterTier = currentClass?.tier || 1

        // Get or update encounter state
        const combatStats = await repos.activityParticipationRepository.getCombatStats(participationId)
        let encounterState = combatStats as EncounterState | null

        if (encounterState && encounterState.encounterPattern) {
          const newIndex = encounterState.encounterIndex + 1
          if (newIndex >= encounterState.encounterPattern.length) {
            // Sequence complete, generate new pattern
            const newPattern = generateEncounterSequence(characterTier)
            encounterState = {
              encounterPattern: newPattern,
              encounterIndex: 0,
              sessionStartedAt: new Date().toISOString()
            }
          } else {
            encounterState = {
              ...encounterState,
              encounterIndex: newIndex
            }
          }
        } else {
          // Initialize encounter state if not present
          const newPattern = generateEncounterSequence(characterTier)
          encounterState = {
            encounterPattern: newPattern,
            encounterIndex: 0,
            sessionStartedAt: new Date().toISOString()
          }
        }

        await repos.activityParticipationRepository.updateCombatStats(participationId, encounterState)

        // Get the current encounter slot
        const currentSlot = getNextEncounterSlot(encounterState.encounterPattern, encounterState.encounterIndex)
        const requiredType = currentSlot?.type

        // Select enemy with fallback chain
        const selected = selectEnemyWithFallback(config.enemySpawnWeights, characterTier, requiredType)

        if (selected) {
          // Apply stat scaling if character tier > enemy tier
          const scaledTemplate = applyStatScaling(selected.template, characterTier)

          const nameKeys = generateEnemyNameKeys(scaledTemplate.type)
          const newEnemy = await repos.combatEnemyRepository!.createEnemy({
            participationId,
            templateId: selected.enemyId,
            namePrefix: nameKeys.prefix,
            nameSuffix: nameKeys.suffix,
            maxHealth: scaledTemplate.health,
            currentHealth: scaledTemplate.health
          })

          const newEnemyName = `${nameKeys.prefix}|${nameKeys.suffix}`

          result.nextEnemy = {
            id: newEnemy.id,
            templateId: selected.enemyId,
            name: newEnemyName,
            currentHealth: scaledTemplate.health,
            maxHealth: scaledTemplate.health
          }

          // Reinitialize tactical state with new enemy
          const playerUnit = updatedState.units.find((u) => u.id.startsWith('player-'))
          if (playerUnit) {
            const newTacticalState = createTacticalStateWithNewEnemy(
              updatedState,
              playerUnit,
              newEnemy.id,
              newEnemyName,
              { current: scaledTemplate.health, max: scaledTemplate.health }
            )
            await repos.activityParticipationRepository.updateTacticalState(participationId, newTacticalState)
          }
        }
      } else if (isActivityCompleted) {
        await repos.activityRepository.completeActivity(participation.activityId)
      }
    }
  }

  return result
}

/**
 * Create a new tactical state with a new enemy spawned.
 * Preserves player state.
 */
export function createTacticalStateWithNewEnemy(
  currentState: TacticalStateData,
  playerUnit: TacticalUnitState,
  newEnemyId: string,
  newEnemyName: string,
  newEnemyHealth: { current: number; max: number }
): TacticalStateData {
  // Create updated player unit with reset turn flags
  const updatedPlayerUnit: TacticalUnitState = {
    ...playerUnit,
    hasMoved: false,
    hasActed: false
  }

  // Create new enemy unit (no position needed)
  const newEnemyUnit: TacticalUnitState = {
    id: newEnemyId,
    name: newEnemyName,
    hasMoved: false,
    hasActed: false,
    currentHealth: newEnemyHealth.current,
    maxHealth: newEnemyHealth.max
  }

  const units = [updatedPlayerUnit, newEnemyUnit]
  const turnOrder = [playerUnit.id, newEnemyId]

  return {
    stateVersion: TACTICAL_STATE_VERSION,
    mapTemplateId: currentState.mapTemplateId,
    gridWidth: currentState.gridWidth,
    gridHeight: currentState.gridHeight,
    tiles: currentState.tiles,
    units,
    turnOrder,
    currentTurnIndex: 0,
    turnNumber: 1
  }
}
