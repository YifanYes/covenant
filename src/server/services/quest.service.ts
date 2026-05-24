import { generateEncounterSequence, getNextEncounterSlot } from '@/shared/constants/encounter-patterns.constants'
import { applyStatScaling } from '@/shared/constants/enemies.constants'
import { generateEnemyNameKeys } from '@/shared/constants/enemy-names.constants'
import { aggregateLoadoutStats } from '@/shared/constants/items.constants'
import { getQuestById, QUESTS, selectEnemyWithFallback } from '@/shared/constants/quests.constants'
import type { CharacterClassType } from '@shared/types/character.types'
import type { EncounterState } from '@shared/types/combat.types'
import type { InventoryItem } from '@shared/types/gamification.types'
import type { TacticalStateData } from '@shared/types/tactical-combat.types'
import { TRPCError } from '@trpc/server'
import { resourceNotFound } from '../lib/errors'
import { logger } from '../lib/logger'
import type { CharacterQuestRepository } from '../repositories/character-quest.repository'
import type { CharacterRepository } from '../repositories/character.repository'
import type { CombatEnemyRepository } from '../repositories/combat-enemy.repository'
import type { CharacterService } from './character.service'
import type { ManaService } from './mana.service'

const log = logger.child({ service: 'quest' })

export class QuestService {
  constructor(
    private characterQuestRepository: CharacterQuestRepository,
    private combatEnemyRepository: CombatEnemyRepository,
    private characterService: CharacterService,
    private manaService: ManaService,
    private characterRepository?: CharacterRepository
  ) {}

  private async assertCharacterOwnership(characterId: string, userId: string): Promise<void> {
    const isOwner = await this.characterService.verifyCharacterOwnership(characterId, userId)
    if (!isOwner) {
      log.warn({ userId, characterId }, 'assertCharacterOwnership: ownership check failed')
      throw resourceNotFound()
    }
  }

  private async assertQuestOwnership(questId: string, userId: string): Promise<void> {
    const isOwner = await this.characterQuestRepository.verifyOwnership(questId, userId)
    if (!isOwner) {
      log.warn({ userId, questId }, 'assertQuestOwnership: ownership check failed')
      throw resourceNotFound()
    }
  }

  private createInitialTacticalState(opts: {
    player: {
      unitId: string
      name: string
      health: { current: number; max: number }
      mana: { current: number; max: number }
      stats: { strengthAtk: number; strengthDef: number; magicAtk: number; magicDef: number; speed: number }
      tier: number
    }
    enemy: {
      unitId: string
      templateId: string
      name: string
      health: { current: number; max: number }
      mana: { current: number; max: number }
      stats: { strengthAtk: number; strengthDef: number; magicAtk: number; magicDef: number; speed: number }
      tier: number
      moves: string[]
    }
  }): TacticalStateData {
    const { player, enemy } = opts

    const playerUnit = {
      id: player.unitId,
      name: player.name,
      currentHealth: player.health.current,
      maxHealth: player.health.max,
      currentMana: player.mana.current,
      maxMana: player.mana.max,
      strengthAtk: player.stats.strengthAtk,
      strengthDef: player.stats.strengthDef,
      magicAtk: player.stats.magicAtk,
      magicDef: player.stats.magicDef,
      speed: player.stats.speed,
      tier: player.tier
    }
    const enemyUnit = {
      id: enemy.unitId,
      templateId: enemy.templateId,
      name: enemy.name,
      currentHealth: enemy.health.current,
      maxHealth: enemy.health.max,
      currentMana: enemy.mana.current,
      maxMana: enemy.mana.max,
      strengthAtk: enemy.stats.strengthAtk,
      strengthDef: enemy.stats.strengthDef,
      magicAtk: enemy.stats.magicAtk,
      magicDef: enemy.stats.magicDef,
      speed: enemy.stats.speed,
      tier: enemy.tier,
      moves: enemy.moves
    }

    // Pokémon-style turn order: higher speed acts first; on tie, player wins initiative
    // (deterministic to avoid race that throws "Not this unit's turn" on first click).
    const units = [playerUnit, enemyUnit]
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

  async startQuest(questId: string, characterId: string, userId: string) {
    await this.assertCharacterOwnership(characterId, userId)

    const template = getQuestById(questId)
    if (!template) {
      log.warn({ userId, characterId, questId }, 'startQuest: quest template not found')
      throw resourceNotFound()
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
        log.error(
          { userId, characterId, questId, characterTier, slot: currentSlot?.type },
          'startQuest: no suitable enemy found for spawn (catalog gap)'
        )
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'No suitable enemy found for spawn' })
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

      // Top up player's active mana from Reserve before the first encounter starts.
      await this.manaService.topUpFromReserve(characterId)

      // Re-read character to pick up the post-topup mana value.
      const refreshed = await this.characterService.getCharacterById(characterId)
      const refreshedClass: CharacterClassType | undefined = refreshed.classes.find(
        (c) => c.className === refreshed.currentClass
      )

      const initialHealth = refreshedClass ? Math.min(refreshedClass.health, refreshedClass.maxHealth) : 10
      const maxHealth = refreshedClass?.maxHealth ?? initialHealth

      const enemyName = `${nameKeys.prefix}|${nameKeys.suffix}`
      const playerManaCurrent = refreshedClass?.mana ?? 0
      const playerManaMax = refreshedClass?.maxMana ?? 0
      const loadout = (refreshed.loadout as unknown as InventoryItem[]) ?? []
      const loadoutTotals = aggregateLoadoutStats(loadout)
      const tacticalState = this.createInitialTacticalState({
        player: {
          unitId: 'player-1',
          name: refreshed.name,
          health: { current: initialHealth, max: maxHealth },
          mana: { current: playerManaCurrent, max: playerManaMax },
          stats: {
            strengthAtk: (refreshedClass?.strengthAtk ?? 0) + loadoutTotals.strengthAtkBonus,
            strengthDef: (refreshedClass?.strengthDef ?? 0) + loadoutTotals.strengthDefBonus,
            magicAtk: (refreshedClass?.magicAtk ?? 0) + loadoutTotals.magicAtkBonus,
            magicDef: (refreshedClass?.magicDef ?? 0) + loadoutTotals.magicDefBonus,
            speed: ((refreshedClass as unknown as { speed?: number })?.speed ?? 1) + loadoutTotals.speed
          },
          tier: refreshedClass?.tier ?? 1
        },
        enemy: {
          unitId: activeEnemy.id,
          templateId: selected.enemyId,
          name: enemyName,
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
        }
      })
      await this.characterQuestRepository.updateTacticalState(quest.id, tacticalState)

      if (this.characterRepository) {
        const progress = (character.onboardingProgress as { questStarted?: boolean } | null) ?? {}
        if (!progress.questStarted) {
          try {
            await this.characterRepository.updateOnboardingProgress(userId, { questStarted: true })
          } catch (err) {
            log.warn({ err, userId }, 'onboarding tick failed: questStarted')
          }
        }
      }

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

    // Repository parses the JSON column through a tolerant schema, so legacy Phaser-grid
    // fields (tiles, gridWidth, turnNumber, position, hasMoved, stateVersion…) are
    // already stripped and malformed rows surface as `null` here.
    const result = await this.characterQuestRepository.findByIdWithTacticalState(questId)
    if (!result || !result.tacticalState) return null
    const state = result.tacticalState

    // Reconcile player unit's HP/MP caps against the live character class.
    // The tactical state is a snapshot taken at quest start; if the character's
    // maxHealth/maxMana changed afterwards (tier-up, revive, balance tuning),
    // the snapshot drifts and the combat HUD shows stale numbers. Current HP/MP
    // are kept in sync by move-resolution writing back to the character row after
    // every move, so we only need to refresh the caps and clamp current values.
    const character = await this.characterService.getCharacterById(result.characterId)
    const currentClass = character.classes.find((c) => c.className === character.currentClass)
    if (!currentClass) return state

    const reconciledUnits = state.units.map((u) => {
      if (!u.id.startsWith('player-')) return u
      const maxHealth = currentClass.maxHealth
      const maxMana = currentClass.maxMana
      const currentHealth = Math.max(0, Math.min(currentClass.health, maxHealth))
      const currentMana = Math.max(0, Math.min(currentClass.mana, maxMana))
      if (
        u.maxHealth === maxHealth &&
        u.maxMana === maxMana &&
        u.currentHealth === currentHealth &&
        u.currentMana === currentMana
      ) {
        return u
      }
      return { ...u, maxHealth, maxMana, currentHealth, currentMana }
    })

    return { ...state, units: reconciledUnits }
  }
}
