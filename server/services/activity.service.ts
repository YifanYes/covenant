import { getEnemy } from '@shared/constants/enemies'
import { getItemById, WeaponDamageType } from '@shared/constants/items'
import type { CombatLogEntry, InventoryItem } from '@shared/types/gamification.types'
import { TRPCError } from '@trpc/server'
import { ACTIVITIES, ActivityDifficulty } from '../../shared/constants/activities'
import type { CharacterWithClasses } from '../../shared/types/character.types'
import type { PrismaClient } from '../generated/prisma'
import { ActivityRepository } from '../repositories/activity.repository'
import { CharacterService } from './character.service'
import { CombatService } from './combat.service'

export class ActivityService {
  private activityRepository: ActivityRepository
  private characterService: CharacterService
  private combatService: CombatService

  constructor(prisma: PrismaClient) {
    this.activityRepository = new ActivityRepository(prisma)
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
        const config = ACTIVITIES.find((a) => a.id === activity.activityId)
        if (!config) return null

        const rawParticipation = characterId
          ? activity.participations.find((p) => p.characterId === characterId)
          : undefined

        const isParticipating = !!rawParticipation && (!activeActivityId || activeActivityId === activity.id)

        return {
          ...config,
          ...activity,
          // Ensure we use the template ID so frontend links work
          id: activity.activityId,
          isParticipating,
          participation:
            isParticipating && rawParticipation
              ? {
                  ...rawParticipation,
                  combatLog: rawParticipation.combatLog as unknown as CombatLogEntry[]
                }
              : undefined
        }
      })
      .filter((a): a is NonNullable<typeof a> => a !== null)
  }

  async joinActivity(activityId: string, characterId: string) {
    const config = ACTIVITIES.find((a) => a.id === activityId)
    if (!config) throw new TRPCError({ code: 'NOT_FOUND', message: `Activity ${activityId} not found` })

    // Calculate target based on difficulty scaling
    const activePlayers = await this.activityRepository.countActiveCharacters()
    const difficultyFactor =
      config.difficulty === ActivityDifficulty.EASY ? 10 : config.difficulty === ActivityDifficulty.NORMAL ? 15 : 25
    const target = config.baseTarget + activePlayers * difficultyFactor

    const activityRecord = await this.activityRepository.getOrCreateActivity(config.id, target, config.durationDays)

    let participation = await this.activityRepository.getParticipation(activityRecord.id, characterId)
    if (!participation) {
      // Initialize with first enemy
      const enemyId = config.enemies[0]
      const enemyTemplate = getEnemy(enemyId)

      participation = await this.activityRepository.createParticipation(activityRecord.id, characterId, {
        currentEnemyId: enemyId,
        currentEnemyHealth: enemyTemplate?.health ?? 10,
        currentEnemyMaxHealth: enemyTemplate?.health ?? 10
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
        currentEnemyId: participation.currentEnemyId,
        currentEnemyHealth: participation.currentEnemyHealth,
        currentEnemyMaxHealth: participation.currentEnemyMaxHealth,
        combatLog: participation.combatLog as unknown as CombatLogEntry[]
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
    const config = ACTIVITIES.find((a) => a.id === activityId)
    if (!config) throw new TRPCError({ code: 'NOT_FOUND', message: `Activity ${activityId} not found` })

    const currentClass = this.combatService.getCurrentClassOrThrow(character)

    const activityRecordId = await this.activityRepository.getActivityIdByTemplateId(config.id)
    if (!activityRecordId) throw new TRPCError({ code: 'NOT_FOUND', message: `Activity ${activityId} not started` })

    const participation = await this.activityRepository.getParticipation(activityRecordId, characterId)
    if (!participation) throw new TRPCError({ code: 'NOT_FOUND', message: 'Participation not found' })

    // Load persisted enemy state or fallback to default
    const enemyId = participation.currentEnemyId || config.enemies[0]
    const enemyTemplate = getEnemy(enemyId)
    if (!enemyTemplate) throw new TRPCError({ code: 'NOT_FOUND', message: `Enemy ${enemyId} not found` })

    // Construct enemy state with persisted health
    const currentEnemy = {
      ...enemyTemplate,
      health: participation.currentEnemyMaxHealth || enemyTemplate.health,
      currentHealth: participation.currentEnemyHealth !== null ? participation.currentEnemyHealth : enemyTemplate.health
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
    const result = this.combatService.resolveTurn({
      attackRolls,
      defenseRolls,
      targetEnemyId: enemyId,
      playerStrengthAtk: currentClass.strengthAtk,
      playerStrengthDef: currentClass.strengthDef,
      playerMagicAtk: currentClass.magicAtk,
      playerMagicDef: currentClass.magicDef,
      playerManaRegen: currentClass.manaRegen,
      weaponDamageType,
      weaponSpeed,
      enemy: currentEnemy,
      tier: currentClass.tier
    })

    // Update player health and mana if changed
    if (result.damageToPlayer > 0 || result.manaRegenerated > 0) {
      const newPlayerHealth = Math.max(0, currentClass.health - result.damageToPlayer)
      const newPlayerMana = Math.min(currentClass.maxMana, currentClass.mana + result.manaRegenerated)

      await this.characterService.updateHealth(currentClass.id, newPlayerHealth, newPlayerMana)
    }

    // Update persisted enemy state
    const newEnemyHealth = Math.max(0, currentEnemy.currentHealth - result.damageToEnemy)
    const enemyDefeated = newEnemyHealth <= 0

    const updateData: any = {
      currentEnemyHealth: newEnemyHealth
    }

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

    let isActivityCompleted = false
    if (enemyDefeated) {
      // 1. Update Enemy Tracking & Tier Promotion
      const enemiesKilled = currentClass.enemiesKilled || { minion: 0, elite: 0, boss: 0 }
      const enemyTypeKey = enemyTemplate.type.toLowerCase() as keyof typeof enemiesKilled // minion, elite, boss
      enemiesKilled[enemyTypeKey] = (enemiesKilled[enemyTypeKey] || 0) + 1

      const totalKills = (enemiesKilled.minion || 0) + (enemiesKilled.elite || 0) + (enemiesKilled.boss || 0)

      let newTier = currentClass.tier
      if (newTier === 1 && totalKills >= 50) {
        newTier = 2
        logs.push(`🎉 PROMOTION! You have reached Tier 2!`)
      } else if (newTier === 2 && totalKills >= 100) {
        newTier = 3
        logs.push(`🎉 PROMOTION! You have reached Tier 3!`)
      }

      await this.characterService.updateProgress(currentClass.id, enemiesKilled, newTier)

      // 2. Update Activity Progress
      await this.activityRepository.updateProgress(activityRecordId, 1)

      // Get updated progress to check if activity is complete
      const updatedActivity = await this.activityRepository.getActivityByTemplateId(config.id)
      isActivityCompleted = !!(updatedActivity && updatedActivity.progress >= updatedActivity.target)

      if (!isActivityCompleted) {
        // Respawn same enemy (or next in list if implemented)
        const nextEnemyId = config.enemies[0]
        const nextEnemyTemplate = getEnemy(nextEnemyId)

        updateData.currentEnemyId = nextEnemyId
        updateData.currentEnemyHealth = nextEnemyTemplate?.health
        updateData.currentEnemyMaxHealth = nextEnemyTemplate?.health
      } else {
        // Clear enemy state
        updateData.currentEnemyId = null
        updateData.currentEnemyHealth = 0
        updateData.currentEnemyMaxHealth = 0

        await this.activityRepository.completeActivity(activityRecordId)
      }

      logs.push(`💀 Enemy defeated! +${config.rewardPerKill} gold`)
    }

    // Prepare log update (Prepend newest logs)
    const existingLogs = (participation.combatLog as unknown as CombatLogEntry[]) || []
    const newEntries = result.logEntries.map((e) => ({
      ...e,
      timestamp: e.timestamp || Date.now()
    }))

    const updatedCombatLog = [...newEntries, ...existingLogs]

    await this.activityRepository.updateParticipationState(
      participation.id,
      updateData,
      enemyDefeated ? config.rewardPerKill : 0,
      updatedCombatLog
    )

    return {
      ...result,
      logs,
      enemyDefeated,
      nextEnemyState:
        enemyDefeated && updateData.currentEnemyId
          ? {
              id: `enemy-${Date.now()}`,
              enemyId: updateData.currentEnemyId,
              currentHealth: updateData.currentEnemyHealth,
              maxHealth: updateData.currentEnemyMaxHealth
            }
          : undefined,
      updatedCombatLog,
      isActivityCompleted
    }
  }
}
