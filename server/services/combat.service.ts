import { DOCTRINES } from '@shared/constants/doctrines'
import { TERRAIN_CONFIG } from '@shared/constants/terrain'
import { calculateGoldReward, DamageType, getEnemy, type EnemyTemplate } from '@shared/constants/enemies'
import { generateEnemyNameKeys } from '@shared/constants/enemy-names'
import { getConsumableById, WeaponDamageType } from '@shared/constants/items'
import { getActivityById, selectRandomEnemy } from '@shared/constants/activities'
import type { CharacterClassType, CharacterWithClasses } from '@shared/types/character.types'
import { DoctrineEffectType, DoctrineTarget, StatusEffect, type ActiveStatusEffect } from '@shared/types/doctrine.types'
import type {
  CombatLogEntry,
  CombatTurnResult,
  DiceRollResult,
  EnemyState,
  InventoryItem,
  ResolveCombatParams
} from '@shared/types/gamification.types'
import { CombatLogType, ItemType } from '@shared/types/gamification.types'
import type {
  GridPosition,
  TacticalStateData,
  TileState,
  TerrainType,
  MovementValidationResult,
  MovementExecutionResult,
  AttackValidationResult,
  TacticalAttackResult,
  TacticalUnitState,
  EnemyTurnResult
} from '@shared/types/tactical-combat.types'
import { TRPCError } from '@trpc/server'
import type { ActivityParticipationRepository } from '../repositories/activity-participation.repository'
import type { ActivityRepository } from '../repositories/activity.repository'
import type { CharacterRepository } from '../repositories/character.repository'
import type { CombatEnemyRepository } from '../repositories/combat-enemy.repository'

// Combat modifiers accumulated from active doctrines and status effects
interface CombatModifiers {
  playerAttackBonusDice: number
  playerDefenseBonusDice: number
  playerAttackThresholdMod: number
  playerDefenseThresholdMod: number
  enemyAttackBonusDice: number
  enemyDefenseBonusDice: number
  playerNegateHits: number
  enemyNegateHits: number
  guaranteedPlayerCritical: boolean
  playerCriticalThresholdMod: number
  directDamageToEnemy: number
  healthRestored: number
  burningDamageToPlayer: number
  burningDamageToEnemy: number
}

const createDefaultModifiers = (): CombatModifiers => ({
  playerAttackBonusDice: 0,
  playerDefenseBonusDice: 0,
  playerAttackThresholdMod: 0,
  playerDefenseThresholdMod: 0,
  enemyAttackBonusDice: 0,
  enemyDefenseBonusDice: 0,
  playerNegateHits: 0,
  enemyNegateHits: 0,
  guaranteedPlayerCritical: false,
  playerCriticalThresholdMod: 0,
  directDamageToEnemy: 0,
  healthRestored: 0,
  burningDamageToPlayer: 0,
  burningDamageToEnemy: 0
})

// Status effect handlers mapped by effect type
const STATUS_EFFECT_HANDLERS: Record<StatusEffect, (mods: CombatModifiers, isPlayer: boolean) => { damage?: number }> =
  {
    [StatusEffect.STUNNED]: (mods, isPlayer) => {
      if (isPlayer) mods.playerAttackBonusDice = -100
      else mods.enemyAttackBonusDice = -100
      return {}
    },
    [StatusEffect.BURNING]: (mods, isPlayer) => {
      if (isPlayer) mods.burningDamageToPlayer += 1
      else mods.burningDamageToEnemy += 1
      return { damage: 1 }
    },
    [StatusEffect.IMMOBILIZED]: (mods, isPlayer) => {
      if (isPlayer) mods.playerDefenseBonusDice -= 1
      else mods.enemyDefenseBonusDice -= 1
      return {}
    },
    [StatusEffect.PURIFIED]: (mods, isPlayer) => {
      // Similar to burning but affects demons
      if (isPlayer) mods.burningDamageToPlayer += 1
      else mods.burningDamageToEnemy += 1
      return { damage: 1 }
    },
    [StatusEffect.POISONED]: (mods, isPlayer) => {
      if (isPlayer) mods.burningDamageToPlayer += 2
      else mods.burningDamageToEnemy += 2
      return { damage: 2 }
    },
    [StatusEffect.DOCTRINE_ACTIVE]: (_mods, _isPlayer) => {
      // Placeholder for active doctrines with immediate effects - no ongoing effect
      return {}
    }
  }

export class CombatService {
  constructor(
    private characterRepository: CharacterRepository,
    private activityParticipationRepository: ActivityParticipationRepository,
    private combatEnemyRepository?: CombatEnemyRepository,
    private activityRepository?: ActivityRepository
  ) {}

  // @ts-ignore: unused for now, will be used in future
  private _resolvePlayerAttack(
    attackRolls: number[],
    weaponDamageType: WeaponDamageType,
    strengthAtk: number,
    magicAtk: number,
    criticalThreshold: number
  ) {
    const threshold = this.getThreshold(weaponDamageType, strengthAtk, magicAtk)
    const { results: playerAttackRolls, count: playerHits } = this.calculateHitsWithCount(
      attackRolls,
      threshold,
      criticalThreshold
    )
    return { playerHits, playerAttackRolls }
  }

  // TODO: for future implementation
  // @ts-ignore: unused for now, will be used in future
  private _resolveEnemyDefense(enemy: EnemyTemplate, weaponDamageType: WeaponDamageType) {
    const threshold = this.getThreshold(weaponDamageType, enemy.strengthDef, enemy.magicDef)

    const enemyDefenseValues = this.rollDice(enemy.defenseDice)
    const { results: enemyDefenseRolls, count: enemyBlocks } = this.calculateHitsWithCount(
      enemyDefenseValues,
      threshold
    )
    return { enemyBlocks, enemyDefenseRolls }
  }

  // @ts-ignore: unused for now, will be used in future
  private _resolveEnemyAttack(enemy: EnemyTemplate) {
    const threshold = this.getThreshold(enemy.damageType, enemy.strengthAtk, enemy.magicAtk)

    const enemyAttackValues = this.rollDice(enemy.attackDice)
    const { results: enemyAttackRolls, count: enemyHits } = this.calculateHitsWithCount(enemyAttackValues, threshold)
    return { enemyHits, enemyAttackRolls }
  }

  // @ts-ignore: unused for now, will be used in future
  private _resolvePlayerDefense(defenseRolls: number[], enemy: EnemyTemplate, strengthDef: number, magicDef: number) {
    const threshold = this.getThreshold(enemy.damageType, strengthDef, magicDef)
    const { results: playerDefenseRolls, count: playerBlocks } = this.calculateHitsWithCount(defenseRolls, threshold)
    return { playerBlocks, playerDefenseRolls }
  }

  /**
   * Process active doctrines/status effects and accumulate combat modifiers.
   * Handles both player and enemy doctrines with a unified approach.
   */
  private processActiveDoctrines(
    doctrines: Record<string, ActiveStatusEffect>,
    mods: CombatModifiers,
    isPlayer: boolean,
    criticalThreshold: number,
    baseTimestamp: number
  ): { updatedDoctrines: Record<string, ActiveStatusEffect>; logs: CombatLogEntry[] } {
    const logs: CombatLogEntry[] = []
    const updated = { ...doctrines }
    const target = isPlayer ? 'player' : 'enemy'
    let timestampOffset = 0.1

    for (const [key, effect] of Object.entries(doctrines)) {
      if (effect.remainingTurns <= 0) continue

      // Apply status effect modifiers
      const handler = STATUS_EFFECT_HANDLERS[effect.effect]
      if (handler) {
        const result = handler(mods, isPlayer)
        logs.push({
          timestamp: baseTimestamp + timestampOffset,
          type: CombatLogType.STATUS_EFFECT,
          data: { effect: effect.effect.toLowerCase(), target, ...(result.damage && { damage: result.damage }) }
        })
        timestampOffset += 0.1
      }

      // Apply doctrine effect modifiers (only for player doctrines with source)
      if (isPlayer) {
        const doctrine = DOCTRINES[effect.sourceDoctrineId]
        if (doctrine?.effects) {
          for (const doctrineEffect of doctrine.effects) {
            const value = doctrineEffect.value || 0
            const logData = this.applyDoctrineEffect(doctrineEffect, mods, doctrine.id, value, criticalThreshold)
            if (logData) {
              logs.push({
                timestamp: baseTimestamp + timestampOffset,
                type: CombatLogType.DOCTRINE_EFFECT,
                data: logData
              })
              timestampOffset += 0.05
            }
          }
        }
      }

      // Decrement duration and handle expiration
      effect.remainingTurns--
      if (effect.remainingTurns <= 0) {
        delete updated[key]
        logs.push({
          timestamp: baseTimestamp + 0.9,
          type: CombatLogType.STATUS_EXPIRED,
          data: { effect: effect.effect, target }
        })
      } else {
        updated[key] = effect
      }
    }

    return { updatedDoctrines: updated, logs }
  }

  /**
   * Apply a single doctrine effect to combat modifiers.
   * Returns log data if the effect was applied, null otherwise.
   */
  private applyDoctrineEffect(
    effect: { type: DoctrineEffectType; target: DoctrineTarget; value?: number },
    mods: CombatModifiers,
    doctrineId: string,
    value: number,
    criticalThreshold: number
  ): Record<string, unknown> | null {
    const { type, target } = effect

    switch (type) {
      case DoctrineEffectType.POWER_MODIFIER:
        if (target === DoctrineTarget.SELF) {
          mods.playerAttackBonusDice += value
          return { doctrine: doctrineId, effect: 'power_boost', value }
        }
        if (target === DoctrineTarget.ENEMY) {
          mods.enemyDefenseBonusDice += value
          return { doctrine: doctrineId, effect: 'enemy_power_reduction', value }
        }
        break

      case DoctrineEffectType.THRESHOLD_MODIFIER:
        if (target === DoctrineTarget.SELF) {
          mods.playerAttackThresholdMod += value
          return { doctrine: doctrineId, effect: 'threshold_reduction', value }
        }
        break

      case DoctrineEffectType.NEGATE_HITS:
        if (target === DoctrineTarget.SELF) {
          mods.playerNegateHits += value
          return { doctrine: doctrineId, effect: 'damage_negation', value }
        }
        break

      case DoctrineEffectType.GUARANTEED_CRITICAL:
        if (target === DoctrineTarget.SELF) {
          if (value === 1) {
            mods.guaranteedPlayerCritical = true
            return { doctrine: doctrineId, effect: 'guaranteed_critical' }
          }
          if (value >= 2 && value <= 6) {
            mods.playerCriticalThresholdMod = criticalThreshold - value
            return { doctrine: doctrineId, effect: 'critical_threshold', newThreshold: value }
          }
        }
        break

      case DoctrineEffectType.DIRECT_DAMAGE:
        if (target === DoctrineTarget.ENEMY || target === DoctrineTarget.ALL_ENEMIES) {
          mods.directDamageToEnemy += value
          return { doctrine: doctrineId, effect: 'direct_damage', value }
        }
        break

      case DoctrineEffectType.HEAL:
        if (target === DoctrineTarget.SELF) {
          mods.healthRestored += value
          return { doctrine: doctrineId, effect: 'heal', value }
        }
        break

      case DoctrineEffectType.APPLY_STATUS:
        // Already applied when doctrine was activated
        break
    }

    return null
  }

  private getThreshold(damageType: WeaponDamageType | DamageType, physical: number, magic: number): number {
    if (damageType === DamageType.BOTH) {
      return Math.max(physical, magic)
    }
    return damageType === WeaponDamageType.PHYSICAL ? physical : magic
  }

  rollDice(count: number): number[] {
    const result: number[] = new Array(count)
    for (let i = 0; i < count; i++) {
      result[i] = Math.floor(Math.random() * 6) + 1
    }
    return result
  }

  /**
   * Calculate hits from dice rolls with optional guaranteed critical
   * @param rolls The dice rolls to evaluate
   * @param threshold The success threshold (e.g., 4+ means values >= 4 succeed)
   * @param criticalThreshold The critical hit threshold (5 for fast weapons, 6 for slow)
   *        - Criticals always hit regardless of threshold
   *        - Criticals can only be blocked by other criticals (6s)
   * @param guaranteedCritical If true, all successful hits are treated as criticals
   */
  calculateHitsWithCount(
    rolls: number[],
    threshold: number,
    criticalThreshold: number = 6,
    guaranteedCritical: boolean = false
  ): { results: DiceRollResult[]; count: number } {
    let count = 0
    const results = rolls.map((value) => {
      const isCritical = guaranteedCritical || value >= criticalThreshold
      const isSuccess = isCritical || value >= threshold
      if (isSuccess) count++
      return { value, isSuccess, isCritical }
    })
    return { results, count }
  }

  initializeEnemyStateFromIds(enemyIds: string[]): EnemyState[] {
    return enemyIds.map((enemyId, index) => {
      const enemy = getEnemy(enemyId)
      return {
        id: `${enemyId}-${index}`,
        templateId: enemyId,
        currentHealth: enemy?.health || 3,
        maxHealth: enemy?.health || 3
      }
    })
  }

  getFirstAliveEnemy(enemyState: EnemyState[]): EnemyState | null {
    return enemyState.find((e) => e.currentHealth > 0) || null
  }

  updateEnemyHealth(enemyState: EnemyState[], targetId: string, damage: number): EnemyState[] {
    return enemyState.map((e) =>
      e.id === targetId ? { ...e, currentHealth: Math.max(0, e.currentHealth - damage) } : e
    )
  }

  async resolveTurn(params: ResolveCombatParams): Promise<CombatTurnResult> {
    const {
      attackRolls,
      defenseRolls,
      targetEnemyId,
      playerStrengthAtk,
      playerStrengthDef,
      playerMagicAtk,
      playerMagicDef,
      playerManaRegen,
      weaponDamageType,
      weaponSpeed,
      enemy,
      participationId
    } = params

    const timestamp = Date.now()
    const logEntries: CombatLogEntry[] = []

    const participation = await this.activityParticipationRepository.findByIdWithDoctrines(participationId)

    const activeDoctrines = participation?.activeDoctrines || {}
    const enemyActiveDoctrines = participation?.enemyActiveDoctrines || {}

    // Calculate initiative and critical threshold based on weapon speed
    let playerWonInitiative = weaponSpeed >= (enemy.speed || 1)
    let criticalThreshold = weaponSpeed >= 2 ? 5 : 6

    // Process doctrines and status effects
    const mods = createDefaultModifiers()

    const { updatedDoctrines: updatedActiveDoctrines, logs: playerLogs } = this.processActiveDoctrines(
      activeDoctrines,
      mods,
      true,
      criticalThreshold,
      timestamp
    )

    const { updatedDoctrines: updatedEnemyActiveDoctrines, logs: enemyLogs } = this.processActiveDoctrines(
      enemyActiveDoctrines,
      mods,
      false,
      criticalThreshold,
      timestamp + 1
    )

    logEntries.push(...playerLogs, ...enemyLogs)

    // Destructure modifiers for use in combat calculations
    const {
      playerAttackBonusDice,
      playerDefenseBonusDice,
      playerAttackThresholdMod,
      playerDefenseThresholdMod,
      enemyAttackBonusDice,
      enemyDefenseBonusDice,
      playerNegateHits,
      enemyNegateHits,
      guaranteedPlayerCritical,
      playerCriticalThresholdMod,
      directDamageToEnemy,
      healthRestored,
      burningDamageToPlayer,
      burningDamageToEnemy
    } = mods

    // Apply modifiers to combat

    // 1. Initial Logging
    logEntries.push({
      timestamp: timestamp + 2,
      type: CombatLogType.PLAYER_ATTACK,
      data: { dice: attackRolls.length, rolls: attackRolls, bonusDice: playerAttackBonusDice }
    })

    // 2. Calculate adjusted attack dice
    let finalAttackRolls = [...attackRolls]

    if (playerAttackBonusDice > 0) {
      // Roll additional dice from doctrine bonuses
      const bonusDiceRolls = this.rollDice(playerAttackBonusDice)
      finalAttackRolls = [...attackRolls, ...bonusDiceRolls]
    } else if (playerAttackBonusDice < -10) {
      // Stunned or similar - no attack
      finalAttackRolls = []
    }

    // 3. Apply critical threshold modification
    const finalCriticalThreshold = Math.max(1, criticalThreshold - playerCriticalThresholdMod)

    // 4. Resolve Player Attack with modifiers
    const adjustedAttackThreshold =
      this.getThreshold(weaponDamageType, playerStrengthAtk, playerMagicAtk) + playerAttackThresholdMod
    const { results: playerAttackRolls, count: playerHits } = this.calculateHitsWithCount(
      finalAttackRolls,
      adjustedAttackThreshold,
      finalCriticalThreshold,
      guaranteedPlayerCritical
    )

    logEntries.push({
      timestamp: timestamp + 3,
      type: CombatLogType.PLAYER_HITS,
      data: { hits: playerHits, criticals: playerAttackRolls.filter((r) => r.isCritical).length }
    })

    // 5. Resolve Enemy Defense with modifiers
    const enemyDefenseDiceCount = Math.max(0, enemy.defenseDice + enemyDefenseBonusDice)
    const enemyDefenseValues = this.rollDice(enemyDefenseDiceCount)

    const enemyDefenseThreshold = this.getThreshold(weaponDamageType, enemy.strengthDef, enemy.magicDef)
    const { results: enemyDefenseRolls, count: enemyBlocks } = this.calculateHitsWithCount(
      enemyDefenseValues,
      enemyDefenseThreshold
    )

    logEntries.push({
      timestamp: timestamp + 4,
      type: CombatLogType.ENEMY_DEFENDS,
      data: { blocks: enemyBlocks, dice: enemyDefenseDiceCount }
    })

    // 6. Calculate damage to enemy with damage negation
    let damageToEnemy = Math.max(0, playerHits - enemyBlocks - enemyNegateHits)

    const enemyKilledBeforeActing = playerWonInitiative && damageToEnemy >= (enemy as any).currentHealth

    // 7. Resolve Enemy Attack (skipped if player won initiative AND killed enemy)
    let enemyHits = 0
    let enemyAttackRolls: { value: number; isSuccess: boolean; isCritical: boolean }[] = []

    if (!enemyKilledBeforeActing) {
      const enemyAttackDiceCount = Math.max(0, enemy.attackDice + enemyAttackBonusDice)

      if (enemyAttackDiceCount > 0) {
        const enemyAttackValues = this.rollDice(enemyAttackDiceCount)
        const enemyAttackThreshold = this.getThreshold(enemy.damageType, enemy.strengthAtk, enemy.magicAtk)

        const enemyAttackResult = this.calculateHitsWithCount(enemyAttackValues, enemyAttackThreshold)
        enemyHits = enemyAttackResult.count
        enemyAttackRolls = enemyAttackResult.results

        logEntries.push({
          timestamp: timestamp + 5,
          type: CombatLogType.ENEMY_ATTACKS,
          data: { hits: enemyHits, dice: enemyAttackDiceCount }
        })
      }
    }

    // 8. Resolve Player Defense with modifiers
    let playerBlocks = 0
    let playerDefenseRolls: { value: number; isSuccess: boolean; isCritical: boolean }[] = []

    if (!enemyKilledBeforeActing && enemyHits > 0) {
      let finalDefenseRolls = [...defenseRolls]

      if (playerDefenseBonusDice > 0) {
        const bonusDefenseRolls = this.rollDice(playerDefenseBonusDice)
        finalDefenseRolls = [...defenseRolls, ...bonusDefenseRolls]
      }

      const adjustedDefenseThreshold =
        this.getThreshold(enemy.damageType, playerStrengthDef, playerMagicDef) + playerDefenseThresholdMod
      const playerDefenseResult = this.calculateHitsWithCount(finalDefenseRolls, adjustedDefenseThreshold)

      playerBlocks = playerDefenseResult.count
      playerDefenseRolls = playerDefenseResult.results

      logEntries.push({
        timestamp: timestamp + 6,
        type: CombatLogType.PLAYER_DEFENDS,
        data: { blocks: playerBlocks, rolls: finalDefenseRolls, bonusDice: playerDefenseBonusDice }
      })
    }

    // 9. Calculate Final Damage with damage negation
    let damageToPlayer = 0
    if (!enemyKilledBeforeActing) {
      damageToPlayer = Math.max(0, enemyHits - playerBlocks - playerNegateHits)
    }

    // Add burning damage to player
    damageToPlayer += burningDamageToPlayer

    // Add direct damage and burning damage to enemy (bypasses defense)
    damageToEnemy += directDamageToEnemy + burningDamageToEnemy

    logEntries.push({
      timestamp: timestamp + 7,
      type: CombatLogType.DAMAGE_TO_ENEMY,
      data: {
        enemy: enemy.name,
        damage: damageToEnemy,
        directDamage: directDamageToEnemy,
        burningDamage: burningDamageToEnemy
      }
    })

    if (damageToPlayer > 0) {
      logEntries.push({
        timestamp: timestamp + 8,
        type: CombatLogType.DAMAGE_TO_PLAYER,
        data: { damage: damageToPlayer, burningDamage: burningDamageToPlayer }
      })
    }

    if (healthRestored > 0) {
      logEntries.push({
        timestamp: timestamp + 8.5,
        type: CombatLogType.DOCTRINE_EFFECT,
        data: { effect: 'heal', value: healthRestored }
      })
    }

    logEntries.push({
      timestamp: timestamp + 9,
      type: CombatLogType.MANA_REGEN,
      data: { mana: playerManaRegen }
    })

    // 10. Update database
    await this.activityParticipationRepository.updateDoctrines(
      participationId,
      updatedActiveDoctrines,
      updatedEnemyActiveDoctrines
    )

    return {
      playerAttackRolls,
      enemyDefenseRolls,
      enemyAttackRolls,
      playerDefenseRolls,
      playerHits,
      enemyBlocks,
      enemyHits,
      playerBlocks,
      damageToEnemy,
      damageToPlayer,
      manaRegenerated: playerManaRegen,
      healthRestored,
      burningDamageToPlayer,
      burningDamageToEnemy,
      directDamageToEnemy,
      targetEnemyId,
      logEntries,
      playerWonInitiative,
      criticalThreshold: finalCriticalThreshold,
      updatedActiveDoctrines,
      updatedEnemyActiveDoctrines
    }
  }

  getCurrentClassOrThrow(character: CharacterWithClasses): CharacterClassType {
    const currentClass = character.classes.find((c) => c.className === character.currentClass)
    if (!currentClass) {
      throw new Error(`Character class ${character.currentClass} not found`)
    }
    return currentClass
  }

  getCharacterProgress(character: CharacterWithClasses) {
    const currentClass = character.classes.find((c) => c.className === character.currentClass)
    const tier = currentClass?.tier || 1
    const diceBank = (character.data as any)?.diceBank || 0
    return { tier, diceBank }
  }

  async useConsumable(
    userId: string,
    consumableId: string
  ): Promise<{ success: boolean; healthRestored?: number; manaRestored?: number }> {
    const consumable = getConsumableById(consumableId)
    if (!consumable) {
      throw new TRPCError({ code: 'NOT_FOUND', message: `Consumable ${consumableId} not found` })
    }

    const character = await this.characterRepository.findWithClassesOrThrow(userId)
    const inventory = (character.inventory as unknown as InventoryItem[]) || []

    const itemIndex = inventory.findIndex(
      (item) => item.type === ItemType.CONSUMABLE && item.definitionId === consumableId
    )
    if (itemIndex === -1) {
      throw new TRPCError({ code: 'NOT_FOUND', message: `Consumable ${consumableId} not in inventory` })
    }

    const currentClass = this.getCurrentClassOrThrow(character)

    let healthRestored = 0
    let manaRestored = 0

    if (consumable.effect.healHealth) {
      healthRestored = Math.min(consumable.effect.healHealth, currentClass.maxHealth - currentClass.health)
    }
    if (consumable.effect.healMana) {
      manaRestored = Math.min(consumable.effect.healMana, currentClass.maxMana - currentClass.mana)
    }

    const newHealth = currentClass.health + healthRestored
    const newMana = currentClass.mana + manaRestored

    await this.characterRepository.updateHealth(currentClass.id, newHealth, newMana)

    const newInventory = [...inventory]
    newInventory.splice(itemIndex, 1)
    await this.characterRepository.updateInventoryAndLoadout(
      character.id,
      newInventory,
      character.loadout as unknown as InventoryItem[]
    )

    return {
      success: true,
      healthRestored: healthRestored > 0 ? healthRestored : undefined,
      manaRestored: manaRestored > 0 ? manaRestored : undefined
    }
  }

  async useDoctrine(
    userId: string,
    doctrineId: string,
    participationId: string
  ): Promise<{ success: boolean; effect: ActiveStatusEffect }> {
    const character = await this.characterRepository.findWithClassesOrThrow(userId)
    const currentClass = this.getCurrentClassOrThrow(character)

    // Validate doctrine exists and it's equipped
    const doctrine = DOCTRINES[doctrineId]
    if (!doctrine) {
      throw new TRPCError({ code: 'NOT_FOUND', message: `Doctrine ${doctrineId} not found` })
    }

    if (!currentClass.equippedDoctrines?.includes(doctrineId)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'This doctrine is not equipped'
      })
    }

    // Validate mana and deduct
    if (currentClass.mana < doctrine.manaCost) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Not enough mana' })
    }

    await this.characterRepository.updateHealth(
      currentClass.id,
      currentClass.health,
      currentClass.mana - doctrine.manaCost
    )

    // Update activity participation state
    const participation = await this.activityParticipationRepository.findByIdWithDoctrines(participationId)

    if (!participation) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Activity participation not found' })
    }

    const activeDoctrines = participation.activeDoctrines || {}

    // Apply first effect as status (for status-applying doctrines) or as immediate effect
    const primaryEffect = doctrine.effects[0]
    let newStatusEffect: ActiveStatusEffect

    if (primaryEffect.type === DoctrineEffectType.APPLY_STATUS && primaryEffect.statusEffect) {
      // Status effect doctrine
      newStatusEffect = {
        effect: primaryEffect.statusEffect,
        remainingTurns: primaryEffect.duration || 1,
        sourceDoctrineId: doctrineId
      }
    } else {
      // Immediate effect doctrine - apply for 1 turn
      newStatusEffect = {
        effect: StatusEffect.DOCTRINE_ACTIVE, // Placeholder for immediate effect doctrines
        remainingTurns: 1,
        sourceDoctrineId: doctrineId
      }
    }

    activeDoctrines[doctrineId] = newStatusEffect

    await this.activityParticipationRepository.updateActiveDoctrines(participationId, activeDoctrines)

    return { success: true, effect: newStatusEffect }
  }

  // ============================================================
  // TACTICAL COMBAT METHODS
  // ============================================================

  /**
   * Validate a tactical movement action.
   * Checks path validity, movement range, terrain costs, and occupancy.
   */
  validateTacticalMove(
    state: TacticalStateData,
    unitId: string,
    path: GridPosition[]
  ): MovementValidationResult {
    // Validate path has at least 2 positions
    if (path.length < 2) {
      return { valid: false, reason: 'Path must have at least 2 positions' }
    }

    // Find the unit
    const unitState = state.units.find((u) => u.id === unitId)
    if (!unitState) {
      return { valid: false, reason: 'Unit not found' }
    }

    // Check if it's the unit's turn
    const currentUnitId = state.turnOrder[state.currentTurnIndex]
    if (currentUnitId !== unitId) {
      return { valid: false, reason: 'Not this unit\'s turn' }
    }

    // Check if unit has already moved
    if (unitState.hasMoved) {
      return { valid: false, reason: 'Unit has already moved this turn' }
    }

    // Verify path starts at unit's current position
    const startPos = path[0]
    if (startPos.x !== unitState.position.x || startPos.y !== unitState.position.y) {
      return { valid: false, reason: 'Path must start at unit\'s current position' }
    }

    // Build occupancy map (excluding the moving unit)
    const occupiedPositions = new Set<string>()
    for (const unit of state.units) {
      if (unit.id !== unitId) {
        occupiedPositions.add(`${unit.position.x},${unit.position.y}`)
      }
    }

    // Calculate path cost and validate each step
    let totalCost = 0
    const destination = path[path.length - 1]

    for (let i = 1; i < path.length; i++) {
      const current = path[i - 1]
      const next = path[i]

      // Validate adjacent movement (cardinal directions only)
      const dx = Math.abs(next.x - current.x)
      const dy = Math.abs(next.y - current.y)
      if ((dx + dy) !== 1) {
        return { valid: false, reason: 'Path contains non-adjacent tiles' }
      }

      // Validate bounds
      if (next.x < 0 || next.x >= state.gridWidth || next.y < 0 || next.y >= state.gridHeight) {
        return { valid: false, reason: 'Path goes out of bounds' }
      }

      // Get tile
      const tile = state.tiles[next.y]?.[next.x]
      if (!tile) {
        return { valid: false, reason: 'Invalid tile in path' }
      }

      // Check if tile is walkable
      if (!tile.isWalkable) {
        return { valid: false, reason: 'Path contains unwalkable tile' }
      }

      // Check occupancy (except for destination which could be the target)
      const posKey = `${next.x},${next.y}`
      if (occupiedPositions.has(posKey) && i < path.length - 1) {
        return { valid: false, reason: 'Path is blocked by another unit' }
      }

      // Final destination must not be occupied
      if (i === path.length - 1 && occupiedPositions.has(posKey)) {
        return { valid: false, reason: 'Destination is occupied' }
      }

      // Calculate terrain movement cost
      const terrainConfig = TERRAIN_CONFIG[tile.terrain]
      const moveCost = terrainConfig?.movementCost ?? 1

      if (!Number.isFinite(moveCost)) {
        return { valid: false, reason: 'Path contains impassable terrain' }
      }

      totalCost += moveCost
    }

    // Get unit's movement range (need to look it up from unit data)
    // For now, we'll pass the movement range in the validation context
    // or assume a default. The caller should check this.

    return { valid: true, pathCost: totalCost }
  }

  /**
   * Execute a tactical movement action.
   * Updates the tactical state with the new unit position.
   */
  async executeTacticalMove(
    participationId: string,
    unitId: string,
    path: GridPosition[],
    movementRange: number
  ): Promise<MovementExecutionResult> {
    // Get current tactical state
    const participation = await this.activityParticipationRepository.findByIdWithTacticalState(participationId)

    if (!participation) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Participation not found' })
    }

    if (!participation.tacticalState || !participation.tacticalState.units || !Array.isArray(participation.tacticalState.units)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'No tactical combat in progress. Please rejoin the activity to initialize combat state.'
      })
    }

    const state = participation.tacticalState

    // Validate the move
    const validation = this.validateTacticalMove(state, unitId, path)

    if (!validation.valid) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: validation.reason || 'Invalid move' })
    }

    // Check movement range
    if (validation.pathCost && validation.pathCost > movementRange) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Move exceeds movement range' })
    }

    // Get destination
    const destination = path[path.length - 1]

    // Update unit position in state
    const unitIndex = state.units.findIndex((u) => u.id === unitId)
    if (unitIndex === -1) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Unit not found in state' })
    }

    const oldPosition = state.units[unitIndex].position

    // Update tiles occupancy
    const updatedTiles = state.tiles.map((row) => row.map((tile) => ({ ...tile })))

    // Clear old tile
    if (updatedTiles[oldPosition.y]?.[oldPosition.x]) {
      updatedTiles[oldPosition.y][oldPosition.x].occupantId = null
    }

    // Set new tile
    if (updatedTiles[destination.y]?.[destination.x]) {
      updatedTiles[destination.y][destination.x].occupantId = unitId
    }

    // Update unit state
    const updatedUnits = state.units.map((unit, i) => {
      if (i === unitIndex) {
        return {
          ...unit,
          position: destination,
          hasMoved: true
        }
      }
      return unit
    })

    // Create updated state
    const updatedState: TacticalStateData = {
      ...state,
      tiles: updatedTiles,
      units: updatedUnits
    }

    // Save to database
    await this.activityParticipationRepository.updateTacticalState(participationId, updatedState)

    return {
      success: true,
      newPosition: destination,
      updatedState
    }
  }

  /**
   * Validate a tactical attack action.
   * Checks if attacker can reach the target based on weapon range.
   */
  validateTacticalAttack(
    state: TacticalStateData,
    attackerId: string,
    targetId: string,
    attackRange: number
  ): AttackValidationResult {
    // Find attacker
    const attackerState = state.units.find((u) => u.id === attackerId)
    if (!attackerState) {
      return { valid: false, reason: 'Attacker not found' }
    }

    // Find target
    const targetState = state.units.find((u) => u.id === targetId)
    if (!targetState) {
      return { valid: false, reason: 'Target not found' }
    }

    // Check if it's the attacker's turn
    const currentUnitId = state.turnOrder[state.currentTurnIndex]
    if (currentUnitId !== attackerId) {
      return { valid: false, reason: 'Not this unit\'s turn' }
    }

    // Check if attacker has already acted
    if (attackerState.hasActed) {
      return { valid: false, reason: 'Unit has already acted this turn' }
    }

    // Calculate Manhattan distance
    const distance =
      Math.abs(attackerState.position.x - targetState.position.x) +
      Math.abs(attackerState.position.y - targetState.position.y)

    // Check range
    if (distance > attackRange) {
      return { valid: false, reason: 'Target out of range', distance }
    }

    return { valid: true, distance }
  }

  /**
   * Execute a tactical attack action.
   * Uses dice rolling to resolve combat and updates the tactical state.
   */
  async executeTacticalAttack(
    participationId: string,
    attackerId: string,
    targetId: string,
    attackerRolls: number[],
    defenderRolls: number[],
    attackRange: number,
    attackThreshold: number,
    defenseThreshold: number,
    attackCriticalThreshold: number = 6
  ): Promise<TacticalAttackResult> {
    // Get current tactical state
    const participation = await this.activityParticipationRepository.findByIdWithTacticalState(participationId)

    if (!participation) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Participation not found' })
    }

    if (!participation.tacticalState || !participation.tacticalState.units || !Array.isArray(participation.tacticalState.units)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'No tactical combat in progress'
      })
    }

    const state = participation.tacticalState

    // Validate the attack
    const validation = this.validateTacticalAttack(state, attackerId, targetId, attackRange)

    if (!validation.valid) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: validation.reason || 'Invalid attack' })
    }

    // Get unit data for combat resolution
    const attackerIndex = state.units.findIndex((u) => u.id === attackerId)
    const targetIndex = state.units.findIndex((u) => u.id === targetId)

    if (attackerIndex === -1 || targetIndex === -1) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Unit not found in state' })
    }

    const timestamp = Date.now()
    const logEntries: CombatLogEntry[] = []

    // Resolve attacker's attack
    const { results: attackerResults, count: attackerHits } = this.calculateHitsWithCount(
      attackerRolls,
      attackThreshold,
      attackCriticalThreshold
    )

    // Log player attack
    logEntries.push({
      timestamp: timestamp + 1,
      type: CombatLogType.PLAYER_ATTACK,
      data: { dice: attackerRolls.length, rolls: attackerRolls }
    })

    logEntries.push({
      timestamp: timestamp + 2,
      type: CombatLogType.PLAYER_HITS,
      data: { hits: attackerHits, criticals: attackerResults.filter((r) => r.isCritical).length }
    })

    // Resolve defender's defense
    const { results: defenderResults, count: defenderBlocks } = this.calculateHitsWithCount(
      defenderRolls,
      defenseThreshold
    )

    // Log enemy defense
    logEntries.push({
      timestamp: timestamp + 3,
      type: CombatLogType.ENEMY_DEFENDS,
      data: { blocks: defenderBlocks, dice: defenderRolls.length }
    })

    // Calculate damage to target
    const damageToTarget = Math.max(0, attackerHits - defenderBlocks)

    // Get current health values from tactical state
    const targetUnit = state.units[targetIndex]
    const attackerUnit = state.units[attackerIndex]

    const targetCurrentHealth = targetUnit.currentHealth
    const attackerCurrentHealth = attackerUnit.currentHealth

    const newTargetHealth = Math.max(0, targetCurrentHealth - damageToTarget)
    const targetKilled = newTargetHealth <= 0

    // Get enemy name from tactical state (name is stored when combat initializes)
    const enemyName = targetUnit.name

    // Log damage to enemy
    logEntries.push({
      timestamp: timestamp + 4,
      type: CombatLogType.DAMAGE_TO_ENEMY,
      data: {
        enemy: enemyName,
        damage: damageToTarget
      }
    })

    // Log enemy defeated if killed
    if (targetKilled) {
      logEntries.push({
        timestamp: timestamp + 5,
        type: CombatLogType.ENEMY_DEFEATED,
        data: {
          enemy: enemyName
        }
      })
    }

    // Counter-attack (if target survives and is in range)
    let counterAttackRolls: { value: number; isSuccess: boolean; isCritical: boolean }[] = []
    let counterDefenseRolls: { value: number; isSuccess: boolean; isCritical: boolean }[] = []
    let damageToAttacker = 0
    let attackerKilled = false

    // For now, skip counter-attacks to keep it simple
    // Counter-attacks can be added in a future iteration

    // Update state
    const updatedUnits = state.units.map((unit, i) => {
      if (i === attackerIndex) {
        return {
          ...unit,
          hasActed: true,
          currentHealth: attackerCurrentHealth - damageToAttacker
        }
      }
      if (i === targetIndex) {
        return {
          ...unit,
          currentHealth: newTargetHealth
        }
      }
      return unit
    })

    // Remove dead units from tiles
    const updatedTiles = state.tiles.map((row) => row.map((tile) => ({ ...tile })))
    if (targetKilled) {
      const targetPos = targetUnit.position
      if (updatedTiles[targetPos.y]?.[targetPos.x]) {
        updatedTiles[targetPos.y][targetPos.x].occupantId = null
      }
    }

    // Filter out dead units from turn order
    const updatedTurnOrder = state.turnOrder.filter((unitId) => {
      const unit = updatedUnits.find((u) => u.id === unitId)
      return unit && unit.currentHealth > 0
    })

    // Adjust current turn index if needed
    let updatedCurrentTurnIndex = state.currentTurnIndex
    if (updatedCurrentTurnIndex >= updatedTurnOrder.length) {
      updatedCurrentTurnIndex = 0
    }

    // Create updated state
    const updatedState: TacticalStateData = {
      ...state,
      tiles: updatedTiles,
      units: updatedUnits.filter((u) => u.currentHealth > 0),
      turnOrder: updatedTurnOrder,
      currentTurnIndex: updatedCurrentTurnIndex
    }

    // Save tactical state to database
    await this.activityParticipationRepository.updateTacticalState(participationId, updatedState)

    // Sync CombatEnemy record and handle defeat
    let goldReward = 0
    let nextEnemy: { id: string; templateId: string; name: string; currentHealth: number; maxHealth: number } | undefined

    if (this.combatEnemyRepository) {
      const activeEnemy = await this.combatEnemyRepository.getActiveEnemy(participationId)
      if (activeEnemy) {
        // Append combat log entries
        await this.combatEnemyRepository.appendToCombatLog(activeEnemy.id, logEntries)

        // Update enemy health in database
        await this.combatEnemyRepository.updateEnemy(activeEnemy.id, {
          currentHealth: newTargetHealth,
          damageDealt: damageToTarget
        })

        // Handle enemy defeat
        if (targetKilled) {
          // Mark enemy as defeated
          await this.combatEnemyRepository.defeatEnemy(activeEnemy.id)

          // Get enemy template for gold calculation
          const enemyTemplate = getEnemy(activeEnemy.templateId)
          if (enemyTemplate) {
            goldReward = calculateGoldReward(enemyTemplate)
          }

          // Update participation stats (kills, gold)
          if (this.activityRepository) {
            await this.activityRepository.updateParticipation(participationId, 1, goldReward)

            // Get participation to find the activity
            const participation = await this.activityParticipationRepository.findByIdWithActivity(participationId)
            if (participation?.activityId) {
              // Update activity progress
              await this.activityRepository.updateProgress(participation.activityId, 1)

              // Get activity config to spawn next enemy
              const activity = await this.activityRepository.getActivityById(participation.activityId)
              if (activity) {
                const config = getActivityById(activity.activityId)

                // Check if activity is complete
                const isActivityCompleted = activity.progress + 1 >= activity.target

                if (!isActivityCompleted && config) {
                  // Spawn next enemy
                  const nextEnemyId = selectRandomEnemy(config.enemySpawnWeights)
                  const nextEnemyTemplate = getEnemy(nextEnemyId)

                  if (nextEnemyTemplate) {
                    const nameKeys = generateEnemyNameKeys(nextEnemyTemplate.type)
                    const newEnemy = await this.combatEnemyRepository.createEnemy({
                      participationId,
                      templateId: nextEnemyId,
                      namePrefix: nameKeys.prefix,
                      nameSuffix: nameKeys.suffix,
                      maxHealth: nextEnemyTemplate.health,
                      currentHealth: nextEnemyTemplate.health
                    })

                    nextEnemy = {
                      id: newEnemy.id,
                      templateId: newEnemy.templateId,
                      name: `${nameKeys.prefix}|${nameKeys.suffix}`,
                      currentHealth: newEnemy.currentHealth,
                      maxHealth: newEnemy.maxHealth
                    }

                    // Reinitialize tactical state with new enemy
                    const playerUnit = updatedState.units.find((u) => u.id.startsWith('player-'))
                    if (playerUnit) {
                      const newTacticalState = this.createTacticalStateWithNewEnemy(
                        updatedState,
                        playerUnit,
                        newEnemy.id,
                        nextEnemy.name,
                        { current: newEnemy.currentHealth, max: newEnemy.maxHealth }
                      )
                      await this.activityParticipationRepository.updateTacticalState(participationId, newTacticalState)
                    }
                  }
                } else if (isActivityCompleted) {
                  await this.activityRepository.completeActivity(participation.activityId)
                }
              }
            }
          }
        }
      }
    }

    return {
      success: true,
      attackerId,
      targetId,
      damageDealt: damageToTarget,
      targetKilled,
      damageToAttacker,
      attackerKilled,
      updatedState,
      attackerRolls: attackerResults,
      defenderRolls: defenderResults,
      counterAttackRolls,
      counterDefenseRolls,
      logEntries,
      goldReward,
      nextEnemy
    }
  }

  /**
   * Create a new tactical state with a new enemy spawned.
   * Preserves player position and state.
   */
  private createTacticalStateWithNewEnemy(
    currentState: TacticalStateData,
    playerUnit: TacticalUnitState,
    newEnemyId: string,
    newEnemyName: string,
    newEnemyHealth: { current: number; max: number }
  ): TacticalStateData {
    // Create fresh grid
    const gridWidth = currentState.gridWidth
    const gridHeight = currentState.gridHeight
    const tiles: TileState[][] = []

    for (let y = 0; y < gridHeight; y++) {
      tiles[y] = []
      for (let x = 0; x < gridWidth; x++) {
        let terrain: TerrainType = 'GRASS'
        if (x === 0 || x === gridWidth - 1 || y === 0 || y === gridHeight - 1) {
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

    // Reset player to starting position
    const playerPosition = { x: 1, y: 3 }
    // Enemy spawns on the right side
    const enemyPosition = { x: 6, y: 3 }

    // Set occupants
    tiles[playerPosition.y][playerPosition.x].occupantId = playerUnit.id
    tiles[enemyPosition.y][enemyPosition.x].occupantId = newEnemyId

    // Create updated player unit with reset position
    const updatedPlayerUnit: TacticalUnitState = {
      ...playerUnit,
      position: playerPosition,
      hasMoved: false,
      hasActed: false
    }

    // Create new enemy unit
    const newEnemyUnit: TacticalUnitState = {
      id: newEnemyId,
      name: newEnemyName,
      position: enemyPosition,
      hasMoved: false,
      hasActed: false,
      currentHealth: newEnemyHealth.current,
      maxHealth: newEnemyHealth.max
    }

    const units = [updatedPlayerUnit, newEnemyUnit]
    const turnOrder = [playerUnit.id, newEnemyId]

    return {
      mapTemplateId: currentState.mapTemplateId,
      gridWidth,
      gridHeight,
      tiles,
      units,
      turnOrder,
      currentTurnIndex: 0,
      turnNumber: 1
    }
  }

  // ============================================================
  // ENEMY AI METHODS
  // ============================================================

  /**
   * Calculate Manhattan distance between two positions.
   */
  private getManhattanDistance(from: GridPosition, to: GridPosition): number {
    return Math.abs(from.x - to.x) + Math.abs(from.y - to.y)
  }

  /**
   * Find the closest player unit to an enemy.
   */
  private findClosestPlayer(
    enemyPos: GridPosition,
    units: TacticalUnitState[]
  ): TacticalUnitState | null {
    const playerUnits = units.filter((u) => u.id.startsWith('player-') && u.currentHealth > 0)
    if (playerUnits.length === 0) return null

    let closest: TacticalUnitState | null = null
    let minDistance = Infinity

    for (const player of playerUnits) {
      const distance = this.getManhattanDistance(enemyPos, player.position)
      if (distance < minDistance) {
        minDistance = distance
        closest = player
      }
    }

    return closest
  }

  /**
   * Calculate movement range tiles using Dijkstra's algorithm.
   * Returns a map of position keys to their costs.
   */
  private calculateMovementRange(
    start: GridPosition,
    movementPoints: number,
    tiles: TileState[][],
    units: TacticalUnitState[],
    isPlayer: boolean
  ): Map<string, { position: GridPosition; cost: number }> {
    const gridHeight = tiles.length
    const gridWidth = tiles[0]?.length ?? 0
    const reachable = new Map<string, { position: GridPosition; cost: number }>()

    if (gridWidth === 0 || gridHeight === 0) return reachable

    // Build occupancy map (opposite side blocks movement)
    const blocked = new Set<string>()
    for (const unit of units) {
      if ((unit.id.startsWith('player-')) !== isPlayer) {
        blocked.add(`${unit.position.x},${unit.position.y}`)
      }
    }

    // Also block friendly units (can't move through allies)
    for (const unit of units) {
      if ((unit.id.startsWith('player-')) === isPlayer) {
        blocked.add(`${unit.position.x},${unit.position.y}`)
      }
    }

    const distances = new Map<string, number>()
    const queue: { position: GridPosition; cost: number }[] = []

    distances.set(`${start.x},${start.y}`, 0)
    queue.push({ position: start, cost: 0 })

    const directions = [
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 }
    ]

    while (queue.length > 0) {
      queue.sort((a, b) => a.cost - b.cost)
      const current = queue.shift()!
      const currentKey = `${current.position.x},${current.position.y}`

      if (distances.has(currentKey) && distances.get(currentKey)! < current.cost) {
        continue
      }

      for (const dir of directions) {
        const nextX = current.position.x + dir.dx
        const nextY = current.position.y + dir.dy
        const nextPos: GridPosition = { x: nextX, y: nextY }
        const nextKey = `${nextX},${nextY}`

        // Check bounds
        if (nextX < 0 || nextX >= gridWidth || nextY < 0 || nextY >= gridHeight) {
          continue
        }

        // Get tile
        const tile = tiles[nextY]?.[nextX]
        if (!tile || !tile.isWalkable) continue

        // Check if blocked
        if (blocked.has(nextKey) && !(nextX === start.x && nextY === start.y)) {
          continue
        }

        // Calculate cost
        const terrainConfig = TERRAIN_CONFIG[tile.terrain]
        const moveCost = terrainConfig?.movementCost ?? 1

        if (!Number.isFinite(moveCost)) continue

        const totalCost = current.cost + moveCost

        if (totalCost > movementPoints) continue

        if (!distances.has(nextKey) || distances.get(nextKey)! > totalCost) {
          distances.set(nextKey, totalCost)
          queue.push({ position: nextPos, cost: totalCost })

          if (nextX !== start.x || nextY !== start.y) {
            reachable.set(nextKey, { position: nextPos, cost: totalCost })
          }
        }
      }
    }

    return reachable
  }

  /**
   * Calculate A* path between two positions.
   */
  private calculateAIPath(
    start: GridPosition,
    end: GridPosition,
    tiles: TileState[][],
    units: TacticalUnitState[],
    movingUnitId: string
  ): GridPosition[] {
    const gridHeight = tiles.length
    const gridWidth = tiles[0]?.length ?? 0

    if (gridWidth === 0 || gridHeight === 0) return []

    // Build occupancy map (all units block except the moving unit)
    const blocked = new Set<string>()
    for (const unit of units) {
      if (unit.id !== movingUnitId) {
        blocked.add(`${unit.position.x},${unit.position.y}`)
      }
    }

    const posKey = (pos: GridPosition) => `${pos.x},${pos.y}`
    const heuristic = (pos: GridPosition) =>
      Math.abs(pos.x - end.x) + Math.abs(pos.y - end.y)

    const openSet: { pos: GridPosition; fScore: number }[] = []
    const cameFrom = new Map<string, GridPosition>()
    const gScore = new Map<string, number>()

    gScore.set(posKey(start), 0)
    openSet.push({ pos: start, fScore: heuristic(start) })

    const directions = [
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 }
    ]

    while (openSet.length > 0) {
      openSet.sort((a, b) => a.fScore - b.fScore)
      const current = openSet.shift()!

      if (current.pos.x === end.x && current.pos.y === end.y) {
        const path: GridPosition[] = []
        let curr: GridPosition | undefined = end
        while (curr) {
          path.unshift(curr)
          curr = cameFrom.get(posKey(curr))
        }
        return path
      }

      const currentKey = posKey(current.pos)
      const currentGScore = gScore.get(currentKey) ?? Infinity

      for (const dir of directions) {
        const nextX = current.pos.x + dir.dx
        const nextY = current.pos.y + dir.dy
        const nextPos: GridPosition = { x: nextX, y: nextY }
        const nextKey = posKey(nextPos)

        if (nextX < 0 || nextX >= gridWidth || nextY < 0 || nextY >= gridHeight) {
          continue
        }

        const tile = tiles[nextY]?.[nextX]
        if (!tile || !tile.isWalkable) continue

        // Allow moving to destination even if blocked (for attack targeting)
        if (blocked.has(nextKey) && !(nextX === end.x && nextY === end.y)) {
          continue
        }

        const terrainConfig = TERRAIN_CONFIG[tile.terrain]
        const moveCost = terrainConfig?.movementCost ?? 1

        if (!Number.isFinite(moveCost)) continue

        const tentativeGScore = currentGScore + moveCost

        if (tentativeGScore < (gScore.get(nextKey) ?? Infinity)) {
          cameFrom.set(nextKey, current.pos)
          gScore.set(nextKey, tentativeGScore)
          const fScore = tentativeGScore + heuristic(nextPos)

          const inOpenSet = openSet.some((item) => item.pos.x === nextX && item.pos.y === nextY)
          if (!inOpenSet) {
            openSet.push({ pos: nextPos, fScore })
          }
        }
      }
    }

    return []
  }

  /**
   * Find the best tile to move to that gets closer to target.
   * Returns the position and path to get there.
   */
  private findBestMoveTowardTarget(
    enemy: TacticalUnitState,
    target: TacticalUnitState,
    movementRange: Map<string, { position: GridPosition; cost: number }>,
    tiles: TileState[][],
    units: TacticalUnitState[],
    enemyAttackRange: number
  ): { position: GridPosition; path: GridPosition[] } | null {
    if (movementRange.size === 0) return null

    // Build set of occupied positions (except enemy's current position)
    const occupied = new Set<string>()
    for (const unit of units) {
      if (unit.id !== enemy.id) {
        occupied.add(`${unit.position.x},${unit.position.y}`)
      }
    }

    // Find the reachable tile that minimizes distance to target
    let bestTile: GridPosition | null = null
    let bestDistance = this.getManhattanDistance(enemy.position, target.position)
    let bestIsInAttackRange = false

    for (const [key, data] of movementRange) {
      // Skip occupied tiles
      if (occupied.has(key)) continue

      const distance = this.getManhattanDistance(data.position, target.position)
      const isInAttackRange = distance <= enemyAttackRange

      // Prefer tiles that put us in attack range, then minimize distance
      if (isInAttackRange && !bestIsInAttackRange) {
        bestTile = data.position
        bestDistance = distance
        bestIsInAttackRange = true
      } else if (isInAttackRange === bestIsInAttackRange && distance < bestDistance) {
        bestTile = data.position
        bestDistance = distance
      }
    }

    if (!bestTile) return null

    // Calculate path to best tile
    const path = this.calculateAIPath(enemy.position, bestTile, tiles, units, enemy.id)
    if (path.length < 2) return null

    return { position: bestTile, path }
  }

  /**
   * Execute an enemy AI turn.
   * Decision tree:
   * 1. If player in attack range → attack
   * 2. Otherwise, move toward player
   * 3. After moving, if player in attack range → attack
   * 4. End turn
   */
  async executeEnemyTurn(
    participationId: string,
    enemyId: string,
    enemyMovementRange: number,
    enemyAttackRange: number,
    enemyAttackDice: number,
    enemyAttackThreshold: number
  ): Promise<EnemyTurnResult> {
    // Get current tactical state
    const participation = await this.activityParticipationRepository.findByIdWithTacticalState(participationId)

    if (!participation) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Participation not found' })
    }

    if (!participation.tacticalState || !participation.tacticalState.units) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'No tactical combat in progress' })
    }

    let state = participation.tacticalState
    const timestamp = Date.now()
    const logEntries: CombatLogEntry[] = []

    // Find the enemy unit
    const enemyIndex = state.units.findIndex((u) => u.id === enemyId)
    if (enemyIndex === -1) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Enemy not found' })
    }

    const enemy = state.units[enemyIndex]

    // Find the enemy in the turn order and sync the turn index
    // The frontend manages turn advancement, so we sync the backend to match
    const enemyTurnIndex = state.turnOrder.indexOf(enemyId)
    if (enemyTurnIndex === -1) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Enemy not in turn order' })
    }

    // Update currentTurnIndex to match the enemy being processed
    state = { ...state, currentTurnIndex: enemyTurnIndex }

    // Find closest player
    const targetPlayer = this.findClosestPlayer(enemy.position, state.units)
    if (!targetPlayer) {
      // No players left - combat should end
      return {
        success: true,
        enemyId,
        action: 'wait',
        moved: false,
        attacked: false,
        updatedState: state
      }
    }

    let moved = false
    let attacked = false
    let path: GridPosition[] | undefined
    let newPosition: GridPosition | undefined
    let targetId: string | undefined
    let damageDealt: number | undefined
    let targetKilled: boolean | undefined
    let attackerRolls: { value: number; isSuccess: boolean; isCritical: boolean }[] | undefined
    let defenderRolls: { value: number; isSuccess: boolean; isCritical: boolean }[] | undefined

    // Check if player is already in attack range
    const initialDistance = this.getManhattanDistance(enemy.position, targetPlayer.position)
    const inAttackRange = initialDistance <= enemyAttackRange

    // If not in attack range and can move, move toward player
    if (!inAttackRange && !enemy.hasMoved) {
      const movementTiles = this.calculateMovementRange(
        enemy.position,
        enemyMovementRange,
        state.tiles,
        state.units,
        false // enemy is not a player
      )

      const moveResult = this.findBestMoveTowardTarget(
        enemy,
        targetPlayer,
        movementTiles,
        state.tiles,
        state.units,
        enemyAttackRange
      )

      if (moveResult) {
        // Execute the move
        const oldPosition = enemy.position
        path = moveResult.path
        newPosition = moveResult.position
        moved = true

        // Update tiles
        const updatedTiles = state.tiles.map((row) => row.map((tile) => ({ ...tile })))
        if (updatedTiles[oldPosition.y]?.[oldPosition.x]) {
          updatedTiles[oldPosition.y][oldPosition.x].occupantId = null
        }
        if (updatedTiles[newPosition.y]?.[newPosition.x]) {
          updatedTiles[newPosition.y][newPosition.x].occupantId = enemyId
        }

        // Update unit state
        const updatedUnits = state.units.map((unit, i) => {
          if (i === enemyIndex) {
            return { ...unit, position: newPosition!, hasMoved: true }
          }
          return unit
        })

        state = { ...state, tiles: updatedTiles, units: updatedUnits }

        logEntries.push({
          timestamp: timestamp + 1,
          type: CombatLogType.ENEMY_ATTACKS, // Use existing log type for now
          data: { enemy: enemy.name, action: 'move', from: oldPosition, to: newPosition }
        })
      }
    }

    // Check attack range again after potential move
    const currentEnemy = state.units.find((u) => u.id === enemyId)!
    const currentTarget = state.units.find((u) => u.id === targetPlayer.id)
    const distanceAfterMove = currentTarget
      ? this.getManhattanDistance(currentEnemy.position, currentTarget.position)
      : Infinity

    // Attack if in range and haven't acted
    if (distanceAfterMove <= enemyAttackRange && !currentEnemy.hasActed && currentTarget) {
      attacked = true
      targetId = targetPlayer.id

      // Roll attack dice
      const attackRolls = this.rollDice(enemyAttackDice)
      const { results: attackResults, count: attackHits } = this.calculateHitsWithCount(
        attackRolls,
        enemyAttackThreshold
      )
      attackerRolls = attackResults

      // Roll defense dice for player (use a standard 2 defense dice)
      const playerDefenseDice = 2
      const defenseRollValues = this.rollDice(playerDefenseDice)
      const { results: defenseResults, count: defenseBlocks } = this.calculateHitsWithCount(
        defenseRollValues,
        4 // Standard defense threshold
      )
      defenderRolls = defenseResults

      // Calculate damage
      damageDealt = Math.max(0, attackHits - defenseBlocks)
      const newTargetHealth = Math.max(0, currentTarget.currentHealth - damageDealt)
      targetKilled = newTargetHealth <= 0

      logEntries.push({
        timestamp: timestamp + 2,
        type: CombatLogType.ENEMY_ATTACKS,
        data: { enemy: enemy.name, hits: attackHits, dice: enemyAttackDice }
      })

      logEntries.push({
        timestamp: timestamp + 3,
        type: CombatLogType.PLAYER_DEFENDS,
        data: { blocks: defenseBlocks, rolls: defenseRollValues }
      })

      logEntries.push({
        timestamp: timestamp + 4,
        type: CombatLogType.DAMAGE_TO_PLAYER,
        data: { damage: damageDealt }
      })

      // Update state with attack result
      let updatedUnits = state.units.map((unit) => {
        if (unit.id === enemyId) {
          return { ...unit, hasActed: true }
        }
        if (unit.id === targetId) {
          return { ...unit, currentHealth: newTargetHealth }
        }
        return unit
      })

      // Update tiles and turn order if target killed
      const updatedTiles = state.tiles.map((row) => row.map((tile) => ({ ...tile })))
      if (targetKilled) {
        const targetPos = currentTarget.position
        if (updatedTiles[targetPos.y]?.[targetPos.x]) {
          updatedTiles[targetPos.y][targetPos.x].occupantId = null
        }
        updatedUnits = updatedUnits.filter((u) => u.currentHealth > 0)

        logEntries.push({
          timestamp: timestamp + 5,
          type: CombatLogType.PLAYER_DEFEATED,
          data: { player: currentTarget.name }
        })
      }

      // Update turn order
      const updatedTurnOrder = state.turnOrder.filter((unitId) => {
        const unit = updatedUnits.find((u) => u.id === unitId)
        return unit && unit.currentHealth > 0
      })

      let updatedCurrentTurnIndex = state.currentTurnIndex
      if (updatedCurrentTurnIndex >= updatedTurnOrder.length) {
        updatedCurrentTurnIndex = 0
      }

      state = {
        ...state,
        tiles: updatedTiles,
        units: updatedUnits,
        turnOrder: updatedTurnOrder,
        currentTurnIndex: updatedCurrentTurnIndex
      }
    }

    // Advance turn to the next unit after enemy completes their turn
    const nextTurnIndex = (state.currentTurnIndex + 1) % state.turnOrder.length
    const nextUnitId = state.turnOrder[nextTurnIndex]

    // Reset hasMoved and hasActed for the next unit
    const unitsWithResetNextUnit = state.units.map((unit) => {
      if (unit.id === nextUnitId) {
        return { ...unit, hasMoved: false, hasActed: false }
      }
      return unit
    })

    // Update turn number if we've completed a full round
    const newTurnNumber = nextTurnIndex === 0 ? state.turnNumber + 1 : state.turnNumber

    state = {
      ...state,
      currentTurnIndex: nextTurnIndex,
      turnNumber: newTurnNumber,
      units: unitsWithResetNextUnit
    }

    // Save state to database
    await this.activityParticipationRepository.updateTacticalState(participationId, state)

    // Save combat log entries
    if (this.combatEnemyRepository && logEntries.length > 0) {
      const activeEnemy = await this.combatEnemyRepository.getActiveEnemy(participationId)
      if (activeEnemy) {
        await this.combatEnemyRepository.appendToCombatLog(activeEnemy.id, logEntries)
      }
    }

    // Determine action type
    let action: 'move' | 'attack' | 'move_and_attack' | 'wait' = 'wait'
    if (moved && attacked) {
      action = 'move_and_attack'
    } else if (moved) {
      action = 'move'
    } else if (attacked) {
      action = 'attack'
    }

    return {
      success: true,
      enemyId,
      action,
      moved,
      path,
      newPosition,
      attacked,
      targetId,
      damageDealt,
      targetKilled,
      attackerRolls,
      defenderRolls,
      updatedState: state,
      logEntries
    }
  }
}
