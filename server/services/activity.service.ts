import { getEnemy } from '@shared/constants/enemies'
import { generateEnemyNameKeys } from '@shared/constants/enemy-names'
import { generateMapTiles } from '@shared/constants/map-themes'
import type { CombatLogEntry } from '@shared/types/gamification.types'
import type { TacticalStateData } from '@shared/types/tactical-combat.types'
import { TRPCError } from '@trpc/server'
import { ActivityDifficulty, getActivityById, selectRandomEnemy } from '../../shared/constants/activities'
import type { ActivityRepository } from '../repositories/activity.repository'
import type { ActivityParticipationRepository } from '../repositories/activity-participation.repository'
import type { CombatEnemyRepository } from '../repositories/combat-enemy.repository'
import type { CharacterService } from './character.service'

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

    // Check if there's an active enemy, if not spawn one
    let activeEnemy = await this.combatEnemyRepository.getActiveEnemy(participation.id)
    let shouldInitializeTacticalState = false
    if (!activeEnemy) {
      const enemyId = selectRandomEnemy(config.enemySpawnWeights)
      const enemyTemplate = getEnemy(enemyId)
      if (!enemyTemplate) throw new TRPCError({ code: 'NOT_FOUND', message: `Enemy ${enemyId} not found` })

      const nameKeys = generateEnemyNameKeys(enemyTemplate.type)
      activeEnemy = await this.combatEnemyRepository.createEnemy({
        participationId: participation.id,
        templateId: enemyId,
        namePrefix: nameKeys.prefix,
        nameSuffix: nameKeys.suffix,
        maxHealth: enemyTemplate.health,
        currentHealth: enemyTemplate.health
      })
      shouldInitializeTacticalState = true
    }

    // Update active activity
    const character = await this.characterService.getCharacterById(characterId)

    // Initialize tactical state if needed (new enemy spawned)
    if (shouldInitializeTacticalState) {
      // Get player health from current class
      const currentClass = character.classes.find((c) => c.className === character.currentClass)
      if (!currentClass) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Current class not found' })
      }

      // Build enemy name from prefix + suffix (stored as translation keys)
      const enemyName = `${activeEnemy.namePrefix}|${activeEnemy.nameSuffix}`
      const tacticalState = this.createInitialTacticalState(
        'player-1', // Player unit ID
        character.name, // Player name
        { current: currentClass.health, max: currentClass.maxHealth },
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
