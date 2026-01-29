import { DOCTRINES } from '@shared/constants/doctrines'
import { TERRAIN_CONFIG } from '@shared/constants/terrain'
import { DamageType, getEnemy, type EnemyTemplate } from '@shared/constants/enemies'
import { getConsumableById, WeaponDamageType } from '@shared/constants/items'
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
  MovementValidationResult,
  MovementExecutionResult
} from '@shared/types/tactical-combat.types'
import { TRPCError } from '@trpc/server'
import type { ActivityParticipationRepository } from '../repositories/activity-participation.repository'
import type { CharacterRepository } from '../repositories/character.repository'

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
    private activityParticipationRepository: ActivityParticipationRepository
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
}
