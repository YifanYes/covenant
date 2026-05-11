import { getQuestById, selectEnemyWithFallback } from '@shared/constants/quests'
import { generateEncounterSequence, getNextEncounterSlot } from '@shared/constants/encounter-patterns'
import { applyStatScaling, calculateGoldReward, getEnemy } from '@shared/constants/enemies'
import { generateEnemyNameKeys } from '@shared/constants/enemy-names'
import type { EncounterState } from '@shared/types/combat.types'
import {
  TACTICAL_STATE_VERSION,
  type TacticalStateData,
  type TacticalUnitState
} from '@shared/types/tactical-combat.types'
import type { CharacterQuestRepository } from '../../repositories/character-quest.repository'
import type { CharacterRepository } from '../../repositories/character.repository'
import type { CombatEnemyRepository } from '../../repositories/combat-enemy.repository'
import type { KillRecordService } from '../../services/kill-record.service'

/** Minimal repo set used by functions that only read/write combat state (no reward processing). */
export interface CombatStateRepos {
  characterRepository: CharacterRepository
  characterQuestRepository: CharacterQuestRepository
  combatEnemyRepository?: CombatEnemyRepository
}

/** Extended repo set for functions that also process rewards, gold, and tier progression. */
export interface CombatRewardDeps extends CombatStateRepos {
  killRecordService?: KillRecordService
}

/** @deprecated Use CombatStateRepos or CombatRewardDeps instead. */
export type CombatRepos = CombatRewardDeps

export interface EnemyDefeatResult {
  goldReward: number
  nextEnemy?: {
    id: string
    templateId: string
    name: string
    currentHealth: number
    maxHealth: number
    currentMana: number
    maxMana: number
  }
  tierProgression?: { oldTier: number; newTier: number }
}

/**
 * Process enemy defeat: award gold, check tier progression, spawn next enemy.
 * Unified logic extracted from executeTacticalAttack and executeTacticalDoctrine.
 */
export async function processEnemyDefeat(
  questId: string,
  updatedState: TacticalStateData,
  killedEnemyIds: string[],
  repos: CombatRewardDeps
): Promise<EnemyDefeatResult> {
  const result: EnemyDefeatResult = {
    goldReward: 0
  }

  if (killedEnemyIds.length === 0 || !repos.combatEnemyRepository) {
    return result
  }

  let activeEnemy = await repos.combatEnemyRepository.getActiveEnemy(questId)

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

  // Update quest progress (kills + gold)
  await repos.characterQuestRepository.updateProgress(questId, 1, result.goldReward)

  // Get the quest to find character and quest template
  const quest = await repos.characterQuestRepository.findById(questId)
  if (!quest) return result

  // Add gold to character's balance
  if (result.goldReward > 0) {
    await repos.characterRepository.addGold(quest.characterId, result.goldReward)
  }

  // Check tier progression after enemy defeat
  if (repos.killRecordService) {
    const tierResult = await repos.killRecordService.checkAndApplyTierProgressionByCharacterId(quest.characterId)
    if (tierResult.tierChanged) {
      result.tierProgression = { oldTier: tierResult.oldTier, newTier: tierResult.newTier }
    }
  }

  // Reload updated quest to get the latest progress
  const updatedQuest = await repos.characterQuestRepository.findById(questId)
  if (!updatedQuest) return result

  const isQuestCompleted = updatedQuest.progress >= updatedQuest.target

  if (isQuestCompleted) {
    await repos.characterQuestRepository.complete(questId)
    return result
  }

  // Quest not complete — spawn next enemy
  const questTemplate = getQuestById(quest.questId)
  if (!questTemplate) return result

  // Get character tier for encounter system
  const character = await repos.characterRepository.findByIdWithClasses(quest.characterId)
  const currentClass = character?.classes.find((c) => c.className === character.currentClass)
  const characterTier = currentClass?.tier || 1

  // Get or update encounter state
  const combatStats = await repos.characterQuestRepository.getCombatStats(questId)
  let encounterState = combatStats as EncounterState | null

  if (encounterState && encounterState.encounterPattern) {
    const newIndex = encounterState.encounterIndex + 1
    if (newIndex >= encounterState.encounterPattern.length) {
      const newPattern = generateEncounterSequence(characterTier)
      encounterState = {
        encounterPattern: newPattern,
        encounterIndex: 0,
        sessionStartedAt: new Date().toISOString()
      }
    } else {
      encounterState = { ...encounterState, encounterIndex: newIndex }
    }
  } else {
    const newPattern = generateEncounterSequence(characterTier)
    encounterState = {
      encounterPattern: newPattern,
      encounterIndex: 0,
      sessionStartedAt: new Date().toISOString()
    }
  }

  await repos.characterQuestRepository.updateCombatStats(questId, encounterState)

  const currentSlot = getNextEncounterSlot(encounterState.encounterPattern, encounterState.encounterIndex)
  const selected = selectEnemyWithFallback(questTemplate.enemySpawnWeights, characterTier, currentSlot?.type)

  if (selected) {
    const scaledTemplate = applyStatScaling(selected.template, characterTier)
    const nameKeys = generateEnemyNameKeys(scaledTemplate.type)

    const newEnemy = await repos.combatEnemyRepository!.createEnemy({
      characterQuestId: questId,
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
      maxHealth: scaledTemplate.health,
      currentMana: scaledTemplate.mana,
      maxMana: scaledTemplate.mana
    }

    // Reinitialize tactical state with new enemy
    const playerUnit = updatedState.units.find((u) => u.id.startsWith('player-'))
    if (playerUnit) {
      const newTacticalState = createTacticalStateWithNewEnemy(updatedState, playerUnit, {
        id: newEnemy.id,
        templateId: selected.enemyId,
        name: newEnemyName,
        health: { current: scaledTemplate.health, max: scaledTemplate.health },
        mana: { current: scaledTemplate.mana, max: scaledTemplate.mana }
      })
      await repos.characterQuestRepository.updateTacticalState(questId, newTacticalState)
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
  newEnemy: {
    id: string
    templateId: string
    name: string
    health: { current: number; max: number }
    mana: { current: number; max: number }
  }
): TacticalStateData {
  const updatedPlayerUnit: TacticalUnitState = {
    ...playerUnit,
    hasMoved: false,
    hasActed: false
  }

  const newEnemyUnit: TacticalUnitState = {
    id: newEnemy.id,
    templateId: newEnemy.templateId,
    name: newEnemy.name,
    hasMoved: false,
    hasActed: false,
    currentHealth: newEnemy.health.current,
    maxHealth: newEnemy.health.max,
    currentMana: newEnemy.mana.current,
    maxMana: newEnemy.mana.max
  }

  const units = [updatedPlayerUnit, newEnemyUnit]
  const turnOrder = [playerUnit.id, newEnemy.id]

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
