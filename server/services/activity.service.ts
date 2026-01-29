import { calculateGoldReward, getEnemy } from '@shared/constants/enemies'
import { generateEnemyNameKeys } from '@shared/constants/enemy-names'
import { getItemById, WeaponDamageType } from '@shared/constants/items'
import type { CombatLogEntry, InventoryItem } from '@shared/types/gamification.types'
import type { TacticalStateData, TileState, TerrainType } from '@shared/types/tactical-combat.types'
import { TRPCError } from '@trpc/server'
import { ActivityDifficulty, getActivityById, selectRandomEnemy } from '../../shared/constants/activities'
import type { CharacterWithClasses } from '../../shared/types/character.types'
import type { ActivityRepository } from '../repositories/activity.repository'
import type { ActivityParticipationRepository } from '../repositories/activity-participation.repository'
import type { CombatEnemyRepository } from '../repositories/combat-enemy.repository'
import type { CharacterService } from './character.service'
import type { CombatService } from './combat.service'

export class ActivityService {
  constructor(
    private activityRepository: ActivityRepository,
    private combatEnemyRepository: CombatEnemyRepository,
    private characterService: CharacterService,
    private combatService: CombatService,
    private activityParticipationRepository: ActivityParticipationRepository
  ) {}

  /**
   * Create default grid for tactical combat (8x6 arena)
   */
  private createDefaultGrid(): TileState[][] {
    const width = 8
    const height = 6
    const tiles: TileState[][] = []

    for (let y = 0; y < height; y++) {
      tiles[y] = []
      for (let x = 0; x < width; x++) {
        // Create border of stone tiles
        let terrain: TerrainType = 'GRASS'
        if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
          terrain = 'STONE'
        }

        tiles[y][x] = {
          position: { x, y },
          terrain,
          occupantId: null,
          isWalkable: true
        }
      }
    }

    return tiles
  }

  /**
   * Create initial tactical state for a new combat
   */
  private createInitialTacticalState(
    playerUnitId: string,
    playerName: string,
    playerHealth: { current: number; max: number },
    enemyUnitId: string,
    enemyName: string,
    enemyHealth: { current: number; max: number }
  ): TacticalStateData {
    const tiles = this.createDefaultGrid()
    const gridWidth = 8
    const gridHeight = 6

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
      mapTemplateId: 'default',
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
        { current: activeEnemy.currentHealth, max: activeEnemy.maxHealth }
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

  async resolveCombatTurn(
    activityId: string,
    characterId: string,
    diceSpent: number,
    attackRolls: number[],
    defenseRolls: number[],
    character: CharacterWithClasses
  ) {
    const config = getActivityById(activityId)
    if (!config) throw new TRPCError({ code: 'NOT_FOUND', message: `Activity ${activityId} not found` })

    const currentClass = this.combatService.getCurrentClassOrThrow(character)

    const activityRecordId = await this.activityRepository.getActivityIdByTemplateId(config.id)
    if (!activityRecordId) throw new TRPCError({ code: 'NOT_FOUND', message: `Activity ${activityId} not started` })

    const participation = await this.activityRepository.getParticipation(activityRecordId, characterId)
    if (!participation) throw new TRPCError({ code: 'NOT_FOUND', message: 'Participation not found' })

    // Get active enemy from CombatEnemy table
    const activeEnemy = await this.combatEnemyRepository.getActiveEnemy(participation.id)
    if (!activeEnemy) throw new TRPCError({ code: 'NOT_FOUND', message: 'No active enemy found' })

    const enemyTemplate = getEnemy(activeEnemy.templateId)
    if (!enemyTemplate) throw new TRPCError({ code: 'NOT_FOUND', message: `Enemy ${activeEnemy.templateId} not found` })

    // Construct enemy state with persisted health
    const currentEnemy = {
      ...enemyTemplate,
      health: activeEnemy.maxHealth,
      currentHealth: activeEnemy.currentHealth
    }

    // Get weapon damage type and speed from loadout
    const loadout = (character.loadout as unknown as InventoryItem[]) || []
    const equippedWeapon = loadout.find((item) => item.type.startsWith('WEAPON_'))
    const weaponDefinition = equippedWeapon?.definitionId ? getItemById(equippedWeapon.definitionId) : undefined
    const weaponDamageType = weaponDefinition?.stats?.damageType || WeaponDamageType.PHYSICAL
    const weaponSpeed = weaponDefinition?.stats?.speed || 1

    // Verify dice spent matches attack rolls
    if (attackRolls.length !== diceSpent) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Dice spent (${diceSpent}) does not match attack rolls (${attackRolls.length})`
      })
    }

    // Resolve combat against currentEnemy
    const result = await this.combatService.resolveTurn({
      attackRolls,
      defenseRolls,
      targetEnemyId: activeEnemy.templateId,
      playerStrengthAtk: currentClass.strengthAtk,
      playerStrengthDef: currentClass.strengthDef,
      playerMagicAtk: currentClass.magicAtk,
      playerMagicDef: currentClass.magicDef,
      playerManaRegen: currentClass.manaRegen,
      weaponDamageType,
      weaponSpeed,
      enemy: currentEnemy,
      participationId: participation.id
    })

    // Update player health and mana if changed
    if (result.damageToPlayer > 0 || result.manaRegenerated > 0 || result.healthRestored > 0) {
      const healthChange = result.healthRestored - result.damageToPlayer
      const newPlayerHealth = Math.max(0, Math.min(currentClass.maxHealth, currentClass.health + healthChange))
      const newPlayerMana = Math.min(currentClass.maxMana, currentClass.mana + result.manaRegenerated)

      await this.characterService.updateHealth(currentClass.id, newPlayerHealth, newPlayerMana)
    }

    // Update persisted enemy state
    const newEnemyHealth = Math.max(0, currentEnemy.currentHealth - result.damageToEnemy)
    const enemyDefeated = newEnemyHealth <= 0

    // Count criticals from result
    const criticalHits = result.playerAttackRolls.filter((r) => r.isCritical).length

    // Build logs from logEntries
    const logs = result.logEntries.map((entry) => {
      switch (entry.type) {
        case 'PLAYER_ATTACK':
          return `You rolled ${entry.data.dice as number} dice: [${(entry.data.rolls as number[]).join(', ')}]`
        case 'PLAYER_HITS':
          return `You scored ${entry.data.hits as number} hits!`
        case 'ENEMY_DEFENDS':
          return `Enemy blocked ${entry.data.blocks as number} hits.`
        case 'ENEMY_ATTACKS':
          return `Enemy attacks with ${entry.data.hits as number} hits!`
        case 'PLAYER_DEFENDS':
          return `You blocked ${entry.data.blocks as number} hits.`
        case 'DAMAGE_TO_ENEMY':
          return `You dealt ${entry.data.damage as number} damage to ${entry.data.enemy}!`
        case 'DAMAGE_TO_PLAYER':
          return `You took ${entry.data.damage as number} damage!`
        case 'MANA_REGEN':
          return `Mana regenerated: +${entry.data.mana as number}`
        case 'ENEMY_DEFEATED':
          return `💀 Enemy defeated!`
        case 'PHASE_COMPLETE':
          return `🚩 Phase complete!`
        default:
          return ''
      }
    })

    // Update enemy stats
    await this.combatEnemyRepository.updateEnemy(activeEnemy.id, {
      currentHealth: newEnemyHealth,
      turnsElapsed: 1,
      damageDealt: result.damageToEnemy,
      damageTaken: result.damageToPlayer,
      criticalHits
    })

    // Update combat log on enemy
    const existingLog = (activeEnemy.combatLog as unknown as CombatLogEntry[]) || []
    const newEntries = result.logEntries.map((e) => ({
      ...e,
      timestamp: e.timestamp || Date.now()
    }))
    const MAX_LOG_ENTRIES = 50
    const updatedCombatLog = [...newEntries, ...existingLog].slice(0, MAX_LOG_ENTRIES)
    await this.combatEnemyRepository.updateEnemy(activeEnemy.id, { combatLog: updatedCombatLog })

    let isActivityCompleted = false
    let nextEnemyState:
      | {
          id: string
          templateId: string
          currentHealth: number
          maxHealth: number
          namePrefix: string
          nameSuffix: string
        }
      | undefined

    if (enemyDefeated) {
      // Mark enemy as defeated
      await this.combatEnemyRepository.defeatEnemy(activeEnemy.id)

      // Calculate gold reward from enemy's reward range
      const goldReward = calculateGoldReward(enemyTemplate)

      // Update kills on participation
      await this.activityRepository.updateParticipation(participation.id, 1, goldReward)

      // Update Activity Progress
      await this.activityRepository.updateProgress(activityRecordId, 1)

      // Check if activity is complete
      const updatedActivity = await this.activityRepository.getActivityByTemplateId(config.id)
      isActivityCompleted = !!(updatedActivity && updatedActivity.progress >= updatedActivity.target)

      if (!isActivityCompleted) {
        // Spawn next enemy using weighted random selection
        const nextEnemyId = selectRandomEnemy(config.enemySpawnWeights)
        const nextEnemyTemplate = getEnemy(nextEnemyId)

        if (nextEnemyTemplate) {
          const nameKeys = generateEnemyNameKeys(nextEnemyTemplate.type)
          const newEnemy = await this.combatEnemyRepository.createEnemy({
            participationId: participation.id,
            templateId: nextEnemyId,
            namePrefix: nameKeys.prefix,
            nameSuffix: nameKeys.suffix,
            maxHealth: nextEnemyTemplate.health,
            currentHealth: nextEnemyTemplate.health
          })

          nextEnemyState = {
            id: newEnemy.id,
            templateId: newEnemy.templateId,
            currentHealth: newEnemy.currentHealth,
            maxHealth: newEnemy.maxHealth,
            namePrefix: newEnemy.namePrefix,
            nameSuffix: newEnemy.nameSuffix
          }

          // Reinitialize tactical state for the new enemy
          const newEnemyName = `${newEnemy.namePrefix}|${newEnemy.nameSuffix}`
          const tacticalState = this.createInitialTacticalState(
            'player-1',
            character.name,
            { current: currentClass.health, max: currentClass.maxHealth },
            newEnemy.id,
            newEnemyName,
            { current: newEnemy.currentHealth, max: newEnemy.maxHealth }
          )
          await this.activityParticipationRepository.updateTacticalState(participation.id, tacticalState)
        }
      } else {
        await this.activityRepository.completeActivity(activityRecordId)
      }

      logs.push(`💀 Enemy defeated! +${goldReward} gold`)
    }

    return {
      ...result,
      logs,
      enemyDefeated,
      nextEnemyState,
      updatedCombatLog,
      isActivityCompleted,
      currentEnemy: {
        namePrefix: activeEnemy.namePrefix,
        nameSuffix: activeEnemy.nameSuffix
      }
    }
  }
}
