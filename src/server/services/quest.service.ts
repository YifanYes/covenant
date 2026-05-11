import { getQuestById, QUESTS, selectEnemyWithFallback } from '@shared/constants/quests'
import { applyStatScaling } from '@shared/constants/enemies'
import { generateEncounterSequence, getNextEncounterSlot } from '@shared/constants/encounter-patterns'
import { generateEnemyNameKeys } from '@shared/constants/enemy-names'
import type { EncounterState } from '@shared/types/combat.types'
import {
  PLAYER_TEMPLATE_ID,
  TACTICAL_STATE_VERSION,
  TerrainType,
  type TacticalStateData,
  type TileState
} from '@shared/types/tactical-combat.types'
import type { CharacterClassType } from '@shared/types/character.types'
import { TRPCError } from '@trpc/server'
import { RESOURCE_NOT_FOUND_OR_FORBIDDEN } from '../lib/errors'
import type { CharacterQuestRepository } from '../repositories/character-quest.repository'
import type { CombatEnemyRepository } from '../repositories/combat-enemy.repository'
import type { CharacterService } from './character.service'

export class QuestService {
  constructor(
    private characterQuestRepository: CharacterQuestRepository,
    private combatEnemyRepository: CombatEnemyRepository,
    private characterService: CharacterService
  ) {}

  private async assertCharacterOwnership(characterId: string, userId: string): Promise<void> {
    const isOwner = await this.characterService.verifyCharacterOwnership(characterId, userId)
    if (!isOwner) {
      throw new TRPCError({ code: 'NOT_FOUND', message: RESOURCE_NOT_FOUND_OR_FORBIDDEN })
    }
  }

  private async assertQuestOwnership(questId: string, userId: string): Promise<void> {
    const isOwner = await this.characterQuestRepository.verifyOwnership(questId, userId)
    if (!isOwner) {
      throw new TRPCError({ code: 'NOT_FOUND', message: RESOURCE_NOT_FOUND_OR_FORBIDDEN })
    }
  }

  private createInitialTacticalState(opts: {
    player: {
      unitId: string
      name: string
      health: { current: number; max: number }
      mana: { current: number; max: number }
    }
    enemy: {
      unitId: string
      templateId: string
      name: string
      health: { current: number; max: number }
      mana: { current: number; max: number }
    }
  }): TacticalStateData {
    const { player, enemy } = opts
    const tiles: TileState[][] = [
      [
        {
          position: { x: 0, y: 0 },
          terrain: TerrainType.GRASS,
          occupantId: null,
          isWalkable: true
        }
      ]
    ]

    const units = [
      {
        id: player.unitId,
        templateId: PLAYER_TEMPLATE_ID,
        name: player.name,
        hasMoved: false,
        hasActed: false,
        currentHealth: player.health.current,
        maxHealth: player.health.max,
        currentMana: player.mana.current,
        maxMana: player.mana.max
      },
      {
        id: enemy.unitId,
        templateId: enemy.templateId,
        name: enemy.name,
        hasMoved: false,
        hasActed: false,
        currentHealth: enemy.health.current,
        maxHealth: enemy.health.max,
        currentMana: enemy.mana.current,
        maxMana: enemy.mana.max
      }
    ]

    return {
      stateVersion: TACTICAL_STATE_VERSION,
      mapTemplateId: 'default',
      gridWidth: 1,
      gridHeight: 1,
      tiles,
      units,
      turnOrder: [player.unitId, enemy.unitId],
      currentTurnIndex: 0,
      turnNumber: 1
    }
  }

  async startQuest(questId: string, characterId: string, userId: string) {
    await this.assertCharacterOwnership(characterId, userId)

    const template = getQuestById(questId)
    if (!template) {
      throw new TRPCError({ code: 'NOT_FOUND', message: `Quest ${questId} not found` })
    }

    const existing = await this.characterQuestRepository.findActiveByCharacterId(characterId)
    if (existing) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Character already has an active quest' })
    }

    const quest = await this.characterQuestRepository.create(characterId, questId, template.objective.target)

    try {
      const character = await this.characterService.getCharacterById(characterId)
      const currentClass: CharacterClassType | undefined = character.classes.find(
        (c) => c.className === character.currentClass
      )
      const characterTier = currentClass?.tier ?? 1

      const encounterPattern = generateEncounterSequence(characterTier)
      const encounterState: EncounterState = {
        encounterPattern,
        encounterIndex: 0,
        sessionStartedAt: new Date().toISOString()
      }
      await this.characterQuestRepository.updateCombatStats(quest.id, encounterState)

      const currentSlot = getNextEncounterSlot(encounterPattern, 0)
      const selected = selectEnemyWithFallback(template.enemySpawnWeights, characterTier, currentSlot?.type)
      if (!selected) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'No suitable enemy found for spawn' })
      }

      const scaledTemplate = applyStatScaling(selected.template, characterTier)
      const nameKeys = generateEnemyNameKeys(scaledTemplate.type)

      const activeEnemy = await this.combatEnemyRepository.createEnemy({
        characterQuestId: quest.id,
        templateId: selected.enemyId,
        namePrefix: nameKeys.prefix,
        nameSuffix: nameKeys.suffix,
        maxHealth: scaledTemplate.health,
        currentHealth: scaledTemplate.health
      })

      const initialHealth = currentClass
        ? Math.min(currentClass.health, currentClass.maxHealth)
        : 10
      const maxHealth = currentClass?.maxHealth ?? initialHealth

      const enemyName = `${nameKeys.prefix}|${nameKeys.suffix}`
      const playerManaCurrent = currentClass?.mana ?? 0
      const playerManaMax = currentClass?.maxMana ?? 0
      const tacticalState = this.createInitialTacticalState({
        player: {
          unitId: 'player-1',
          name: character.name,
          health: { current: initialHealth, max: maxHealth },
          mana: { current: playerManaCurrent, max: playerManaMax }
        },
        enemy: {
          unitId: activeEnemy.id,
          templateId: selected.enemyId,
          name: enemyName,
          health: { current: scaledTemplate.health, max: scaledTemplate.health },
          mana: { current: scaledTemplate.mana, max: scaledTemplate.mana }
        }
      })
      await this.characterQuestRepository.updateTacticalState(quest.id, tacticalState)

      return {
        quest,
        activeEnemy: {
          id: activeEnemy.id,
          templateId: activeEnemy.templateId,
          namePrefix: activeEnemy.namePrefix,
          nameSuffix: activeEnemy.nameSuffix,
          currentHealth: activeEnemy.currentHealth,
          maxHealth: activeEnemy.maxHealth
        }
      }
    } catch (error) {
      // Mark the quest abandoned so the character isn't permanently stuck with a broken active quest
      await this.characterQuestRepository.abandon(quest.id).catch(() => undefined)
      throw error
    }
  }

  async getActiveQuest(characterId: string, userId: string) {
    await this.assertCharacterOwnership(characterId, userId)

    const quest = await this.characterQuestRepository.findActiveByCharacterId(characterId)
    if (!quest) return null

    const activeEnemy = await this.combatEnemyRepository.getActiveEnemy(quest.id)

    return {
      id: quest.id,
      characterId: quest.characterId,
      questId: quest.questId,
      status: quest.status,
      progress: quest.progress,
      target: quest.target,
      goldEarned: quest.goldEarned,
      tacticalState: quest.tacticalState,
      activeEnemy: activeEnemy
        ? {
            id: activeEnemy.id,
            templateId: activeEnemy.templateId,
            namePrefix: activeEnemy.namePrefix,
            nameSuffix: activeEnemy.nameSuffix,
            currentHealth: activeEnemy.currentHealth,
            maxHealth: activeEnemy.maxHealth
          }
        : undefined
    }
  }

  async getAvailableQuests(userId: string, characterId?: string) {
    let activeQuestTemplateId: string | null = null
    let activeCharacterQuestId: string | null = null
    if (characterId) {
      await this.assertCharacterOwnership(characterId, userId)
      const active = await this.characterQuestRepository.findActiveByCharacterId(characterId)
      activeQuestTemplateId = active?.questId ?? null
      activeCharacterQuestId = active?.id ?? null
    }

    return Object.values(QUESTS).map((template) => ({
      ...template,
      isActive: template.id === activeQuestTemplateId,
      activeCharacterQuestId: template.id === activeQuestTemplateId ? activeCharacterQuestId : null
    }))
  }

  async abandonQuest(questId: string, userId: string) {
    await this.assertQuestOwnership(questId, userId)
    await this.characterQuestRepository.abandon(questId)
  }

  async getTacticalState(questId: string, userId: string): Promise<TacticalStateData | null> {
    await this.assertQuestOwnership(questId, userId)

    const result = await this.characterQuestRepository.findByIdWithTacticalState(questId)
    const state = result?.tacticalState ?? null
    if (state && state.stateVersion !== TACTICAL_STATE_VERSION) return null
    return state
  }
}
