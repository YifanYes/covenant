import { calculateGoldReward, getEnemy } from '@shared/constants/enemies'
import { generateEnemyNameKeys } from '@shared/constants/enemy-names'
import { getItemById, WeaponDamageType } from '@shared/constants/items'
import type { CombatLogEntry, InventoryItem } from '@shared/types/gamification.types'
import { TRPCError } from '@trpc/server'
import { ActivityDifficulty, getActivityById, selectRandomEnemy } from '../../shared/constants/activities'
import type { CharacterWithClasses } from '../../shared/types/character.types'
import type { PrismaClient } from '../generated/prisma'
import { ActivityRepository } from '../repositories/activity.repository'
import { CombatEnemyRepository } from '../repositories/combat-enemy.repository'
import { CharacterService } from './character.service'
import { CombatService } from './combat.service'

export class ActivityService {
  private activityRepository: ActivityRepository
  private combatEnemyRepository: CombatEnemyRepository
  private characterService: CharacterService
  private combatService: CombatService

  constructor(prisma: PrismaClient) {
    this.activityRepository = new ActivityRepository(prisma)
    this.combatEnemyRepository = new CombatEnemyRepository(prisma)
    this.characterService = new CharacterService(prisma)
    this.combatService = new CombatService(prisma)
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
    }

    // Update active activity
    const character = await this.characterService.getCharacterById(characterId)
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
