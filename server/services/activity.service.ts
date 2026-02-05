import { selectEnemyWithFallback } from '@shared/constants/activities'
import { applyStatScaling, getEnemy } from '@shared/constants/enemies'
import { generateEnemyNameKeys } from '@shared/constants/enemy-names'
import { generateEncounterSequence, getNextEncounterSlot, type ResolvedEncounterSlot } from '@shared/constants/encounter-patterns'
import { generateMapTiles } from '@shared/constants/map-themes'
import type { CombatLogEntry } from '@shared/types/gamification.types'
import { TACTICAL_STATE_VERSION, type TacticalStateData } from '@shared/types/tactical-combat.types'
import { TRPCError } from '@trpc/server'
import { ActivityDifficulty, getActivityById } from '../../shared/constants/activities'
import type { ActivityRepository } from '../repositories/activity.repository'
import type { ActivityParticipationRepository } from '../repositories/activity-participation.repository'
import type { CombatEnemyRepository } from '../repositories/combat-enemy.repository'
import type { CharacterService } from './character.service'

export interface EncounterState {
  encounterPattern: ResolvedEncounterSlot[]
  encounterIndex: number
  sessionStartedAt: string
}

export class ActivityService {
  constructor(
    private activityRepository: ActivityRepository,
    private combatEnemyRepository: CombatEnemyRepository,
    private characterService: CharacterService,
    private activityParticipationRepository: ActivityParticipationRepository
  ) {}

  /**
   * Create initial tactical state for a new combat
   */
  private createInitialTacticalState(
    playerUnitId: string,
    playerName: string,
    playerHealth: { current: number; max: number },
    enemyUnitId: string,
    enemyName: string,
    enemyHealth: { current: number; max: number },
    mapId: string = 'default'
  ): TacticalStateData {
    const gridWidth = 8
    const gridHeight = 6
    const tiles = generateMapTiles(mapId, gridWidth, gridHeight)

    // Player spawns on the left side
    const playerPosition = { x: 1, y: 3 }
    // Enemy spawns on the right side
    const enemyPosition = { x: 6, y: 3 }

    // Set occupants on tiles
    tiles[playerPosition.y][playerPosition.x].occupantId = playerUnitId
    tiles[enemyPosition.y][enemyPosition.x].occupantId = enemyUnitId

    // Create unit state entries with health values
    const units = [
      {
        id: playerUnitId,
        name: playerName,
        position: playerPosition,
        hasMoved: false,
        hasActed: false,
        currentHealth: playerHealth.current,
        maxHealth: playerHealth.max
      },
      {
        id: enemyUnitId,
        name: enemyName,
        position: enemyPosition,
        hasMoved: false,
        hasActed: false,
        currentHealth: enemyHealth.current,
        maxHealth: enemyHealth.max
      }
    ]

    // Player goes first (higher speed assumed)
    const turnOrder = [playerUnitId, enemyUnitId]

    return {
      stateVersion: TACTICAL_STATE_VERSION,
      mapTemplateId: mapId,
      gridWidth,
      gridHeight,
      tiles,
      units,
      turnOrder,
      currentTurnIndex: 0,
      turnNumber: 1
    }
  }

  async getActivities(characterId?: string) {
    const activities = await this.activityRepository.getActiveActivities()

    let activeActivityId: string | undefined
    if (characterId) {
      const character = await this.characterService.getCharacterById(characterId)
      activeActivityId = (character.data as any)?.activeActivityId
    }

    return activities
      .map((activity) => {
        const config = getActivityById(activity.activityId)
        if (!config) return null

        const rawParticipation = characterId
          ? activity.participations.find((p) => p.characterId === characterId)
          : undefined

        const isParticipating = !!rawParticipation && (!activeActivityId || activeActivityId === activity.id)

        // Get active enemy from participation
        const activeEnemy = rawParticipation?.enemies?.[0]

        return {
          ...config,
          ...activity,
          id: activity.activityId,
          isParticipating,
          participation:
            isParticipating && rawParticipation
              ? {
                  id: rawParticipation.id,
                  kills: rawParticipation.kills,
                  goldEarned: rawParticipation.goldEarned,
                  joinedAt: rawParticipation.joinedAt,
                  lastCombatAt: rawParticipation.lastCombatAt,
                  activeEnemy: activeEnemy
                    ? {
                        id: activeEnemy.id,
                        templateId: activeEnemy.templateId,
                        currentHealth: activeEnemy.currentHealth,
                        maxHealth: activeEnemy.maxHealth,
                        namePrefix: activeEnemy.namePrefix,
                        nameSuffix: activeEnemy.nameSuffix,
                        combatLog: (activeEnemy.combatLog as unknown as CombatLogEntry[]) || []
                      }
                    : undefined
                }
              : undefined
        }
      })
      .filter((a): a is NonNullable<typeof a> => a !== null)
  }

  async joinActivity(activityId: string, characterId: string) {
    const config = getActivityById(activityId)
    if (!config) throw new TRPCError({ code: 'NOT_FOUND', message: `Activity ${activityId} not found` })

    // Calculate target based on difficulty scaling
    const activePlayers = await this.activityRepository.countActiveCharacters()
    const difficultyFactor =
      config.difficulty === ActivityDifficulty.EASY ? 10 : config.difficulty === ActivityDifficulty.NORMAL ? 15 : 25
    const target = config.baseTarget + activePlayers * difficultyFactor

    const activityRecord = await this.activityRepository.getOrCreateActivity(config.id, target, config.durationDays)

    let participation = await this.activityRepository.getParticipation(activityRecord.id, characterId)
    if (!participation) {
      participation = await this.activityRepository.createParticipation(activityRecord.id, characterId)
    }

    // Get character for tier information
    const character = await this.characterService.getCharacterById(characterId)
    const currentClass = character.classes.find((c) => c.className === character.currentClass)
    const characterTier = currentClass?.tier || 1

    // Check if there's an active enemy, if not spawn one
    let activeEnemy = await this.combatEnemyRepository.getActiveEnemy(participation.id)
    let shouldInitializeTacticalState = false

    // Get or initialize encounter state
    let combatStats = await this.activityParticipationRepository.getCombatStats(participation.id)
    let encounterState = combatStats as EncounterState | null

    if (!activeEnemy) {
      // Generate new encounter pattern if needed
      if (!encounterState || !encounterState.encounterPattern) {
        const encounterPattern = generateEncounterSequence(characterTier)
        encounterState = {
          encounterPattern,
          encounterIndex: 0,
          sessionStartedAt: new Date().toISOString()
        }
        await this.activityParticipationRepository.updateCombatStats(participation.id, encounterState)
      }

      // Get the current encounter slot
      const currentSlot = getNextEncounterSlot(encounterState.encounterPattern, encounterState.encounterIndex)
      const requiredType = currentSlot?.type

      // Select enemy with fallback chain
      const selected = selectEnemyWithFallback(config.enemySpawnWeights, characterTier, requiredType)
      if (!selected) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'No suitable enemy found for spawn' })
      }

      // Apply stat scaling if character tier > enemy tier
      const scaledTemplate = applyStatScaling(selected.template, characterTier)

      const nameKeys = generateEnemyNameKeys(scaledTemplate.type)
      activeEnemy = await this.combatEnemyRepository.createEnemy({
        participationId: participation.id,
        templateId: selected.enemyId,
        namePrefix: nameKeys.prefix,
        nameSuffix: nameKeys.suffix,
        maxHealth: scaledTemplate.health,
        currentHealth: scaledTemplate.health
      })
      shouldInitializeTacticalState = true
    }

    // Initialize tactical state if needed (new enemy spawned)
    if (shouldInitializeTacticalState) {
      if (!currentClass) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Current class not found' })
      }

      // Build enemy name from prefix + suffix (stored as translation keys)
      const enemyName = `${activeEnemy.namePrefix}|${activeEnemy.nameSuffix}`
      // Clamp health to maxHealth when initializing combat
      // (health may exceed maxHealth from accumulated healing, but combat HP is bounded)
      const initialHealth = Math.min(currentClass.health, currentClass.maxHealth)
      const tacticalState = this.createInitialTacticalState(
        'player-1', // Player unit ID
        character.name, // Player name
        { current: initialHealth, max: currentClass.maxHealth },
        activeEnemy.id, // Use enemy's DB ID as unit ID
        enemyName,
        { current: activeEnemy.currentHealth, max: activeEnemy.maxHealth },
        config.mapId // Use activity's map ID for terrain generation
      )
      await this.activityParticipationRepository.updateTacticalState(participation.id, tacticalState)
    }
    const currentData = (character.data as any) || {}
    await this.characterService.updateData(characterId, {
      ...currentData,
      activeActivityId: activityRecord.id
    })

    return {
      success: true,
      activityId: activityRecord.id,
      participation: {
        id: participation.id,
        kills: participation.kills,
        goldEarned: participation.goldEarned,
        joinedAt: participation.joinedAt,
        activeEnemy: {
          id: activeEnemy.id,
          templateId: activeEnemy.templateId,
          currentHealth: activeEnemy.currentHealth,
          maxHealth: activeEnemy.maxHealth,
          namePrefix: activeEnemy.namePrefix,
          nameSuffix: activeEnemy.nameSuffix,
          combatLog: (activeEnemy.combatLog as unknown as CombatLogEntry[]) || []
        }
      }
    }
  }
}
