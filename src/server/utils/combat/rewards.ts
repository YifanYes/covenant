import { generateEncounterSequence, getNextEncounterSlot } from '@/shared/constants/encounter-patterns.constants'
import { applyStatScaling, calculateGoldReward, getEnemy } from '@/shared/constants/enemies.constants'
import { generateEnemyNameKeys } from '@/shared/constants/enemy-names.constants'
import { getQuestById, selectEnemyWithFallback } from '@/shared/constants/quests.constants'
import type { EncounterState } from '@shared/types/combat.types'
import type { TacticalStateData, TacticalUnitState } from '@shared/types/tactical-combat.types'
import type { CharacterQuestRepository } from '../../repositories/character-quest.repository'
import type { CharacterRepository } from '../../repositories/character.repository'
import type { CombatEnemyRepository } from '../../repositories/combat-enemy.repository'
import type { GuildService } from '../../services/guild.service'
import type { KillRecordService } from '../../services/kill-record.service'
import type { ManaService } from '../../services/mana.service'

/** Minimal repo set used by functions that only read/write combat state (no reward processing). */
export interface CombatStateRepos {
  characterRepository: CharacterRepository
  characterQuestRepository: CharacterQuestRepository
  combatEnemyRepository?: CombatEnemyRepository
}

/** Extended repo set for functions that also process rewards, gold, and tier progression. */
export interface CombatRewardDeps extends CombatStateRepos {
  killRecordService?: KillRecordService
  manaService?: ManaService
  guildService?: GuildService
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
 * Unified logic extracted from executeTacticalAttack and executeTacticalAbility.
 */
export async function processEnemyDefeat(
  questId: string,
  updatedState: TacticalStateData,
  killedEnemyIds: string[],
  repos: CombatRewardDeps,
  userId?: string
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
    const baseGold = calculateGoldReward(enemyTemplate)
    // Apply guild-tier gold multiplier + record kill/gold contribution events
    // in a single membership lookup. `applyCombatRewards` is fail-safe — it
    // returns baseGold and logs internally on lookup failure. Capped at +20%
    // (tier 5); the post-multiplier amount feeds GOLD_EARNED tracking — small
    // feedback loop bounded by the multiplier cap.
    if (repos.guildService && userId) {
      try {
        result.goldReward = await repos.guildService.applyCombatRewards(userId, baseGold)
      } catch {
        // belt-and-suspenders: applyCombatRewards handles its own errors, but
        // never let the buff path break the reward flow.
        result.goldReward = baseGold
      }
    } else {
      result.goldReward = baseGold
    }
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

  // Guild campaign + contribution events (ENEMY_KILL, GOLD_EARNED) are now recorded
  // inside `applyCombatRewards` above, sharing the same membership lookup as the
  // gold multiplier — saves two round-trips per defeat in the combat hot path.

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

    // Reinitialize tactical state with new enemy. Player mana is refreshed from the latest
    // CharacterClass row (the player may have taken damage or burned mana mid-fight and the
    // Reserve top-up below brings active mana back up to maxMana).
    const playerUnit = updatedState.units.find((u) => u.id.startsWith('player-'))
    if (playerUnit) {
      let refreshedPlayer = playerUnit
      if (repos.manaService) {
        await repos.manaService.topUpFromReserve(quest.characterId)
      }
      const char = await repos.characterRepository.findByIdWithClasses(quest.characterId)
      const cls = char?.classes.find((c) => c.className === char.currentClass)
      if (cls) {
        refreshedPlayer = {
          ...playerUnit,
          currentHealth: Math.min(playerUnit.currentHealth, cls.maxHealth),
          maxHealth: cls.maxHealth,
          currentMana: cls.mana,
          maxMana: cls.maxMana
        }
      }
      const newTacticalState = createTacticalStateWithNewEnemy(updatedState, refreshedPlayer, {
        id: newEnemy.id,
        templateId: selected.enemyId,
        name: newEnemyName,
        health: { current: scaledTemplate.health, max: scaledTemplate.health },
        mana: { current: scaledTemplate.mana, max: scaledTemplate.mana },
        stats: {
          strengthAtk: scaledTemplate.strengthAtk,
          strengthDef: scaledTemplate.strengthDef,
          magicAtk: scaledTemplate.magicAtk,
          magicDef: scaledTemplate.magicDef,
          speed: scaledTemplate.speed
        },
        tier: scaledTemplate.tier,
        moves: scaledTemplate.moves
      })
      await repos.characterQuestRepository.updateTacticalState(questId, newTacticalState)
    }
  }

  return result
}

/**
 * Create a new tactical state with a new enemy spawned.
 * Preserves player state; refreshes player mana from CharacterClass for the next encounter (top-up
 * happens in QuestService before this is called).
 */
export function createTacticalStateWithNewEnemy(
  _currentState: TacticalStateData,
  playerUnit: TacticalUnitState,
  newEnemy: {
    id: string
    templateId: string
    name: string
    health: { current: number; max: number }
    mana: { current: number; max: number }
    stats: { strengthAtk: number; strengthDef: number; magicAtk: number; magicDef: number; speed: number }
    tier: number
    moves: string[]
  }
): TacticalStateData {
  const newEnemyUnit: TacticalUnitState = {
    id: newEnemy.id,
    templateId: newEnemy.templateId,
    name: newEnemy.name,
    currentHealth: newEnemy.health.current,
    maxHealth: newEnemy.health.max,
    currentMana: newEnemy.mana.current,
    maxMana: newEnemy.mana.max,
    strengthAtk: newEnemy.stats.strengthAtk,
    strengthDef: newEnemy.stats.strengthDef,
    magicAtk: newEnemy.stats.magicAtk,
    magicDef: newEnemy.stats.magicDef,
    speed: newEnemy.stats.speed,
    tier: newEnemy.tier,
    moves: newEnemy.moves
  }

  const units = [playerUnit, newEnemyUnit]
  // Pokémon-style turn order: higher speed acts first; on tie, player wins initiative
  // (deterministic to avoid race that throws "Not this unit's turn" on first click).
  const turnOrder = [...units]
    .sort((a, b) => {
      if (b.speed !== a.speed) return b.speed - a.speed
      if (a.id.startsWith('player-')) return -1
      if (b.id.startsWith('player-')) return 1
      return 0
    })
    .map((u) => u.id)

  return {
    units,
    turnOrder,
    currentTurnIndex: 0
  }
}
