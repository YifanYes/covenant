import { DOCTRINES } from '@shared/constants/doctrines'
import {
  getAoETilesWithRotation,
  getDoctrineAoEPattern,
  getDoctrineRange
} from '@shared/constants/aoe-patterns'
import { TERRAIN_CONFIG } from '@shared/constants/terrain'
import { calculateGoldReward, getEnemy } from '@shared/constants/enemies'
import { generateEnemyNameKeys } from '@shared/constants/enemy-names'
import { getConsumableById } from '@shared/constants/items'
import { getActivityById, selectRandomEnemy } from '@shared/constants/activities'
import type { CharacterClassType, CharacterWithClasses } from '@shared/types/character.types'
import { DoctrineEffectType, DoctrineTarget, StatusEffect, type ActiveStatusEffect } from '@shared/types/doctrine.types'
import type {
  CombatLogEntry,
  DiceRollResult,
  InventoryItem
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
  EnemyTurnResult,
  TacticalDoctrineResult
} from '@shared/types/tactical-combat.types'
import { TRPCError } from '@trpc/server'
import type { ActivityParticipationRepository } from '../repositories/activity-participation.repository'
import type { ActivityRepository } from '../repositories/activity.repository'
import type { CharacterRepository } from '../repositories/character.repository'
import type { CombatEnemyRepository } from '../repositories/combat-enemy.repository'

export class CombatService {
  constructor(
    private characterRepository: CharacterRepository,
    private activityParticipationRepository: ActivityParticipationRepository,
    private combatEnemyRepository?: CombatEnemyRepository,
    private activityRepository?: ActivityRepository
  ) {}

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

    // Check for active doctrine buffs on the attacker
    const attackerUnit = state.units[attackerIndex]
    const buffs = this.getActiveDoctrineBuffs(attackerUnit.activeDoctrines)

    // Log doctrine buff if active
    if (buffs.bonusDice > 0 || buffs.thresholdMod !== 0 || buffs.guaranteedCritical || buffs.criticalThresholdMod > 0) {
      logEntries.push({
        timestamp: timestamp + 0.5,
        type: CombatLogType.DOCTRINE_EFFECT,
        data: {
          effect: buffs.guaranteedCritical ? 'guaranteed_critical' : buffs.thresholdMod !== 0 ? 'threshold_reduction' : 'power_boost',
          bonusDice: buffs.bonusDice,
          sixesGenerateExtraHits: buffs.sixesGenerateExtraHits,
          thresholdMod: buffs.thresholdMod,
          guaranteedCritical: buffs.guaranteedCritical,
          criticalThresholdMod: buffs.criticalThresholdMod
        }
      })
    }

    // Apply threshold modifier from doctrines (negative value = lower threshold = easier to hit)
    const effectiveAttackThreshold = Math.max(2, attackThreshold + buffs.thresholdMod)

    // Apply critical threshold modifier from doctrines (e.g., 5+ crits instead of 6+)
    const effectiveCriticalThreshold = Math.max(2, attackCriticalThreshold - buffs.criticalThresholdMod)

    // Resolve attacker's attack with applied buffs
    const { results: attackerResults, count: baseAttackerHits } = this.calculateHitsWithCount(
      attackerRolls,
      effectiveAttackThreshold,
      effectiveCriticalThreshold,
      buffs.guaranteedCritical
    )

    // For Stellar Collapse: 6s generate extra hits (criticals count as 2 hits each)
    let attackerHits = baseAttackerHits
    if (buffs.sixesGenerateExtraHits) {
      const criticalCount = attackerResults.filter((r) => r.isCritical).length
      attackerHits += criticalCount // Add extra hit for each 6
    }

    // Log player attack
    logEntries.push({
      timestamp: timestamp + 1,
      type: CombatLogType.PLAYER_ATTACK,
      data: { dice: attackerRolls.length, rolls: attackerRolls, bonusDice: buffs.bonusDice }
    })

    logEntries.push({
      timestamp: timestamp + 2,
      type: CombatLogType.PLAYER_HITS,
      data: {
        hits: attackerHits,
        criticals: attackerResults.filter((r) => r.isCritical).length,
        extraHitsFrom6s: buffs.sixesGenerateExtraHits ? attackerResults.filter((r) => r.isCritical).length : 0
      }
    })

    // Resolve defender's defense first to know total incoming hits
    const { results: defenderResults, count: defenderBlocks } = this.calculateHitsWithCount(
      defenderRolls,
      defenseThreshold
    )

    // Calculate raw damage before defense buffs (for percentage-based negation)
    const rawDamage = Math.max(0, attackerHits - defenderBlocks)

    // Check for NEGATE_HITS buff on defender (if defender is a player unit)
    // Pass incoming hits for percentage-based negation (fractal_invocation)
    const defenderUnit = state.units[targetIndex]
    const defenderBuffs = this.getActiveDoctrineBuffs(defenderUnit.activeDoctrines, rawDamage)

    // Total blocks = dice blocks + negated hits from doctrines (may include percentage-based)
    const totalBlocks = defenderBlocks + defenderBuffs.negateHits

    // Log enemy defense (includes negated hits if any)
    logEntries.push({
      timestamp: timestamp + 3,
      type: CombatLogType.ENEMY_DEFENDS,
      data: {
        blocks: defenderBlocks,
        dice: defenderRolls.length,
        negatedHits: defenderBuffs.negateHits > 0 ? defenderBuffs.negateHits : undefined
      }
    })

    // Calculate damage to target (applying negate hits from defender's buffs)
    const damageToTarget = Math.max(0, attackerHits - totalBlocks)

    // Get current health values from tactical state
    const targetUnit = state.units[targetIndex]

    const targetCurrentHealth = targetUnit.currentHealth
    const attackerCurrentHealth = attackerUnit.currentHealth

    const newTargetHealth = Math.max(0, targetCurrentHealth - damageToTarget)
    const targetKilled = newTargetHealth <= 0

    // Get enemy name from tactical state (name is stored when combat initializes)
    const enemyName = targetUnit.name

    // KARMIC_RETRIBUTION (Thorns): If defender has thorns buff and takes damage, deal damage back to attacker
    let thornsDamageToAttacker = 0
    if (damageToTarget > 0 && defenderBuffs.thornsDamage > 0) {
      thornsDamageToAttacker = defenderBuffs.thornsDamage
      logEntries.push({
        timestamp: timestamp + 3.5,
        type: CombatLogType.DOCTRINE_EFFECT,
        data: {
          effect: 'thorns',
          damage: thornsDamageToAttacker,
          source: 'karmic_retribution'
        }
      })
    }

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

    // Calculate self-damage from rolling 1s (plasma_missile, audacity special behavior)
    let selfDamageFromOnes = 0
    if (buffs.onesHurtSelf) {
      selfDamageFromOnes = attackerRolls.filter((roll) => roll === 1).length
      if (selfDamageFromOnes > 0) {
        damageToAttacker += selfDamageFromOnes
        logEntries.push({
          timestamp: timestamp + 4.5,
          type: CombatLogType.DAMAGE_TO_PLAYER,
          data: {
            damage: selfDamageFromOnes,
            source: 'self_damage_from_ones',
            onesRolled: selfDamageFromOnes
          }
        })
      }
    }

    // Add thorns damage from karmic_retribution
    if (thornsDamageToAttacker > 0) {
      damageToAttacker += thornsDamageToAttacker
    }

    // Check if attacker is killed by self-damage or thorns
    const newAttackerHealth = Math.max(0, attackerCurrentHealth - damageToAttacker)
    attackerKilled = newAttackerHealth <= 0

    // Update state - clear consumed doctrines from attacker and defense buffs from defender
    const updatedUnits = state.units.map((unit, i) => {
      if (i === attackerIndex) {
        return {
          ...unit,
          hasActed: true,
          currentHealth: newAttackerHealth,
          activeDoctrines: this.clearConsumedDoctrines(unit.activeDoctrines)
        }
      }
      if (i === targetIndex) {
        return {
          ...unit,
          currentHealth: newTargetHealth,
          // Clear defense buffs (NEGATE_HITS) from defender after they take damage
          activeDoctrines: damageToTarget > 0 || defenderBuffs.negateHits > 0
            ? this.clearConsumedDefenseDoctrines(unit.activeDoctrines)
            : unit.activeDoctrines
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
    if (attackerKilled) {
      const attackerPos = attackerUnit.position
      if (updatedTiles[attackerPos.y]?.[attackerPos.x]) {
        updatedTiles[attackerPos.y][attackerPos.x].occupantId = null
      }
      logEntries.push({
        timestamp: timestamp + 5.5,
        type: CombatLogType.PLAYER_DEFEATED,
        data: { cause: 'self_damage_from_ones' }
      })
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
      nextEnemy,
      selfDamageFromOnes: selfDamageFromOnes > 0 ? selfDamageFromOnes : undefined
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

    // Find the enemy in the turn order and sync the turn index
    // The frontend manages turn advancement, so we sync the backend to match
    const enemyTurnIndex = state.turnOrder.indexOf(enemyId)
    if (enemyTurnIndex === -1) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Enemy not in turn order' })
    }

    // Update currentTurnIndex to match the enemy being processed
    state = { ...state, currentTurnIndex: enemyTurnIndex }

    // Reset the enemy's turn flags at the start of their turn
    // This ensures they can move/act even if flags weren't properly reset from previous rounds
    const unitsWithResetEnemy = state.units.map((unit, i) => {
      if (i === enemyIndex) {
        return { ...unit, hasMoved: false, hasActed: false }
      }
      return unit
    })
    state = { ...state, units: unitsWithResetEnemy }

    // Update enemy reference after state change
    const enemy = state.units[enemyIndex]

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
    const isNewRound = nextTurnIndex === 0

    state = {
      ...state,
      currentTurnIndex: nextTurnIndex,
      turnNumber: newTurnNumber,
      units: unitsWithResetNextUnit
    }

    // Regenerate mana at the start of a new round
    let manaRegenerated: number | undefined
    if (isNewRound && participation.characterId) {
      const character = await this.characterRepository.findByIdWithClasses(participation.characterId)
      if (character) {
        const currentClass = this.getCurrentClassOrThrow(character)
        const currentMana = currentClass.mana
        const maxMana = currentClass.maxMana
        const baseRegen = 1 // Base mana regeneration per round

        if (currentMana < maxMana) {
          manaRegenerated = Math.min(baseRegen, maxMana - currentMana)
          await this.characterRepository.updateHealth(
            currentClass.id,
            currentClass.health,
            currentMana + manaRegenerated
          )
        }
      }
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
      logEntries,
      manaRegenerated
    }
  }

  // ============================================================
  // TACTICAL DOCTRINE METHODS
  // ============================================================

  /**
   * Calculate tiles affected by an AoE doctrine.
   */
  calculateAoETargets(
    targetPosition: GridPosition,
    casterPosition: GridPosition,
    doctrineId: string,
    state: TacticalStateData
  ): { tiles: GridPosition[]; unitIds: string[] } {
    const pattern = getDoctrineAoEPattern(doctrineId)
    const affectedTiles = getAoETilesWithRotation(
      targetPosition,
      casterPosition,
      pattern,
      state.gridWidth,
      state.gridHeight
    )

    // Find units in affected tiles
    const affectedSet = new Set(affectedTiles.map(t => `${t.x},${t.y}`))
    const affectedUnitIds: string[] = []

    for (const unit of state.units) {
      const posKey = `${unit.position.x},${unit.position.y}`
      if (affectedSet.has(posKey)) {
        // Only include enemies for damage doctrines
        // For now, assuming caster is player-unit (starts with 'player-')
        if (!unit.id.startsWith('player-')) {
          affectedUnitIds.push(unit.id)
        }
      }
    }

    return { tiles: affectedTiles, unitIds: affectedUnitIds }
  }

  /**
   * Validate a tactical doctrine action.
   * Checks if doctrine can be cast (equipped, mana, range).
   */
  validateTacticalDoctrine(
    state: TacticalStateData,
    casterId: string,
    doctrineId: string,
    targetPosition: GridPosition,
    casterMana: number
  ): { valid: boolean; reason?: string } {
    // Find caster
    const casterState = state.units.find((u) => u.id === casterId)
    if (!casterState) {
      return { valid: false, reason: 'Caster not found' }
    }

    // Check if it's the caster's turn
    const currentUnitId = state.turnOrder[state.currentTurnIndex]
    if (currentUnitId !== casterId) {
      return { valid: false, reason: 'Not this unit\'s turn' }
    }

    // Check if caster has already acted
    if (casterState.hasActed) {
      return { valid: false, reason: 'Unit has already acted this turn' }
    }

    // Get doctrine
    const doctrine = DOCTRINES[doctrineId]
    if (!doctrine) {
      return { valid: false, reason: 'Doctrine not found' }
    }

    // Check mana
    if (casterMana < doctrine.manaCost) {
      return { valid: false, reason: 'Not enough mana' }
    }

    // Check range
    const castRange = getDoctrineRange(doctrineId)
    const distance =
      Math.abs(casterState.position.x - targetPosition.x) +
      Math.abs(casterState.position.y - targetPosition.y)

    if (distance > castRange) {
      return { valid: false, reason: 'Target out of range' }
    }

    return { valid: true }
  }

  /**
   * Execute a tactical doctrine action.
   * Applies doctrine effects to all targets in the AoE.
   */
  async executeTacticalDoctrine(
    participationId: string,
    casterId: string,
    doctrineId: string,
    targetPosition: GridPosition,
    casterMana: number
  ): Promise<TacticalDoctrineResult> {
    // Get current tactical state
    const participation = await this.activityParticipationRepository.findByIdWithTacticalState(participationId)

    if (!participation) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Participation not found' })
    }

    if (!participation.tacticalState || !participation.tacticalState.units) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'No tactical combat in progress' })
    }

    const state = participation.tacticalState

    // Validate the doctrine action
    const validation = this.validateTacticalDoctrine(state, casterId, doctrineId, targetPosition, casterMana)

    if (!validation.valid) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: validation.reason || 'Invalid doctrine use' })
    }

    // Get doctrine definition
    const doctrine = DOCTRINES[doctrineId]!

    // Find caster
    const casterIndex = state.units.findIndex((u) => u.id === casterId)
    const caster = state.units[casterIndex]

    // Calculate AoE targets
    const { tiles: affectedTiles, unitIds: affectedUnitIds } = this.calculateAoETargets(
      targetPosition,
      caster.position,
      doctrineId,
      state
    )

    const timestamp = Date.now()
    const logEntries: CombatLogEntry[] = []
    const effects: TacticalDoctrineResult['effects'] = []

    // Track special doctrine results
    let manaRestored = 0
    let selfDamage = 0
    let killCount = 0

    // Log doctrine cast
    logEntries.push({
      timestamp,
      type: CombatLogType.DOCTRINE_EFFECT,
      data: { doctrine: doctrineId, caster: caster.name, targetCount: affectedUnitIds.length }
    })

    // Process doctrine effects for each target
    let updatedUnits = [...state.units]

    for (const effect of doctrine.effects) {
      switch (effect.type) {
        case DoctrineEffectType.DIRECT_DAMAGE:
          // Apply direct damage to all targets
          for (const targetId of affectedUnitIds) {
            const targetIndex = updatedUnits.findIndex((u) => u.id === targetId)
            if (targetIndex === -1) continue

            const target = updatedUnits[targetIndex]
            let damage = effect.value || 0

            // SUMMARY_EXECUTION: Check healthThreshold - only execute if target is below threshold
            if (effect.healthThreshold !== undefined && effect.healthThreshold > 0) {
              const healthPercent = target.currentHealth / target.maxHealth
              if (healthPercent >= effect.healthThreshold) {
                // Target is NOT below threshold - deal no damage, log the failure
                logEntries.push({
                  timestamp: timestamp + 0.1,
                  type: CombatLogType.DOCTRINE_EFFECT,
                  data: {
                    effect: 'execute_failed',
                    reason: 'target_above_threshold',
                    threshold: effect.healthThreshold,
                    targetHealthPercent: healthPercent,
                    enemy: target.name
                  }
                })
                effects.push({
                  unitId: targetId,
                  damageDealt: 0,
                  killed: false
                })
                continue // Skip this target
              }
              // Target is below threshold - execute (deal massive damage)
              logEntries.push({
                timestamp: timestamp + 0.05,
                type: CombatLogType.DOCTRINE_EFFECT,
                data: {
                  effect: 'execute_triggered',
                  threshold: effect.healthThreshold,
                  enemy: target.name
                }
              })
            }

            const newHealth = Math.max(0, target.currentHealth - damage)
            const killed = newHealth <= 0

            updatedUnits[targetIndex] = {
              ...target,
              currentHealth: newHealth
            }

            effects.push({
              unitId: targetId,
              damageDealt: damage,
              killed
            })

            logEntries.push({
              timestamp: timestamp + 0.1,
              type: CombatLogType.DAMAGE_TO_ENEMY,
              data: { enemy: target.name, damage, directDamage: damage }
            })

            if (killed) {
              logEntries.push({
                timestamp: timestamp + 0.2,
                type: CombatLogType.ENEMY_DEFEATED,
                data: { enemy: target.name }
              })
            }
          }
          break

        case DoctrineEffectType.APPLY_STATUS:
          // Apply status effect to all targets
          for (const targetId of affectedUnitIds) {
            // Skip player units for enemy-targeted status effects
            if (effect.target === DoctrineTarget.ALL_ENEMIES || effect.target === DoctrineTarget.ENEMY) {
              if (targetId.startsWith('player-')) continue
            }

            const targetIndex = updatedUnits.findIndex((u) => u.id === targetId)
            if (targetIndex === -1) continue

            const target = updatedUnits[targetIndex]

            // Create the active status effect
            const activeEffect: ActiveStatusEffect = {
              effect: effect.statusEffect!,
              remainingTurns: effect.duration || 1,
              sourceDoctrineId: doctrineId
            }

            // Add status effect to unit's activeEffects
            const currentEffects = target.activeEffects || []
            updatedUnits[targetIndex] = {
              ...target,
              activeEffects: [...currentEffects, activeEffect]
            }

            effects.push({
              unitId: targetId,
              statusApplied: effect.statusEffect
            })

            logEntries.push({
              timestamp: timestamp + 0.1,
              type: CombatLogType.STATUS_EFFECT,
              data: { effect: effect.statusEffect?.toLowerCase(), target: target.name }
            })
          }
          break

        case DoctrineEffectType.POWER_MODIFIER:
          // INSPIRATION: Self buff that scales with enemy tier (+2 dice per tier)
          if (effect.scalesWithEnemyTier && effect.target === DoctrineTarget.SELF) {
            // Find the targeted enemy to get their tier
            let enemyTier = 2 // Default tier if not found
            for (const targetId of affectedUnitIds) {
              if (targetId.startsWith('player-')) continue
              const targetUnit = state.units.find((u) => u.id === targetId)
              if (targetUnit) {
                // Get enemy template to find tier
                // Unit's name contains the templateId info, or we can look it up
                // For tactical state, we need to get the enemy from the database
                const enemyTemplate = getEnemy(targetUnit.name.split('|')[0]) // Try to get from name
                  || state.units.find(u => u.id === targetId) // Fallback
                if (enemyTemplate && 'tier' in enemyTemplate) {
                  enemyTier = (enemyTemplate as any).tier || 2
                } else {
                  // Try to infer tier from enemy health (rough estimate)
                  // Tier 1: ~4-8 HP, Tier 2: ~8-14 HP, Tier 3: ~14+ HP
                  if (targetUnit.maxHealth >= 14) enemyTier = 3
                  else if (targetUnit.maxHealth >= 8) enemyTier = 2
                  else enemyTier = 1
                }
                break // Use first enemy found
              }
            }

            // Calculate bonus dice: tier * 2
            const bonusDice = enemyTier * 2

            // Create buff effect on caster
            const activeEffect: ActiveStatusEffect = {
              effect: StatusEffect.DOCTRINE_ACTIVE,
              remainingTurns: 1,
              sourceDoctrineId: doctrineId
            }

            // Update caster's active doctrines with the scaled value
            // Store the calculated bonus in a way that getActiveDoctrineBuffs can use
            const casterInUnits = updatedUnits.findIndex((u) => u.id === casterId)
            if (casterInUnits !== -1) {
              const currentCaster = updatedUnits[casterInUnits]
              const existingDoctrines = currentCaster.activeDoctrines || {}

              // Store inspiration with calculated bonus dice in a metadata field
              updatedUnits[casterInUnits] = {
                ...currentCaster,
                activeDoctrines: {
                  ...existingDoctrines,
                  [doctrineId]: activeEffect,
                  // Store the calculated bonus dice as a special entry
                  [`${doctrineId}_bonus`]: { ...activeEffect, calculatedBonusDice: bonusDice } as any
                }
              }
            }

            logEntries.push({
              timestamp: timestamp + 0.1,
              type: CombatLogType.DOCTRINE_EFFECT,
              data: {
                effect: 'inspiration_buff',
                enemyTier,
                bonusDice,
                doctrine: doctrineId
              }
            })

            effects.push({
              unitId: casterId,
              bonusDice
            })
            break // Don't fall through to normal POWER_MODIFIER handling
          }

          // POWER_MODIFIER with SELF target: Roll power dice and deal damage to enemies in AoE
          // This is used by doctrines like stellar_collapse (10 dice, 6s generate extra hits)
          if (effect.target === DoctrineTarget.SELF) {
            const powerDice = effect.value || 0
            if (powerDice > 0) {
              // Roll power dice
              const powerRolls = this.rollDice(powerDice)
              // Threshold 4+ to hit, 6s are criticals (generate extra hits)
              const { results: rollResults, count: hits } = this.calculateHitsWithCount(
                powerRolls,
                4, // Standard attack threshold
                6  // 6s are criticals
              )

              // Count extra hits from criticals (6s)
              const criticalCount = rollResults.filter(r => r.isCritical).length
              const totalHits = hits + criticalCount // Criticals generate extra hits

              logEntries.push({
                timestamp: timestamp + 0.05,
                type: CombatLogType.PLAYER_ATTACK,
                data: { dice: powerDice, rolls: powerRolls, hits: totalHits, criticals: criticalCount }
              })

              // Apply damage to all enemies in the AoE
              for (const targetId of affectedUnitIds) {
                // Only damage enemy units (skip player units)
                if (targetId.startsWith('player-')) continue

                const targetIndex = updatedUnits.findIndex((u) => u.id === targetId)
                if (targetIndex === -1) continue

                const target = updatedUnits[targetIndex]
                const newHealth = Math.max(0, target.currentHealth - totalHits)
                const killed = newHealth <= 0

                updatedUnits[targetIndex] = {
                  ...target,
                  currentHealth: newHealth
                }

                effects.push({
                  unitId: targetId,
                  damageDealt: totalHits,
                  killed
                })

                logEntries.push({
                  timestamp: timestamp + 0.1,
                  type: CombatLogType.DAMAGE_TO_ENEMY,
                  data: { enemy: target.name, damage: totalHits, hits: totalHits }
                })

                if (killed) {
                  killCount++
                  logEntries.push({
                    timestamp: timestamp + 0.2,
                    type: CombatLogType.ENEMY_DEFEATED,
                    data: { enemy: target.name }
                  })
                }
              }

              // DISINTEGRATION_RAY: Refund mana on kill
              if (doctrineId === 'disintegration_ray' && killCount > 0) {
                manaRestored = doctrine.manaCost
                logEntries.push({
                  timestamp: timestamp + 0.3,
                  type: CombatLogType.DOCTRINE_EFFECT,
                  data: { effect: 'mana_refund', manaRestored: manaRestored, reason: 'kill' }
                })
              }
            }
          } else if (effect.target === DoctrineTarget.ALL_ENEMIES || effect.target === DoctrineTarget.ENEMY) {
            // For enemy-targeted power modifiers, apply WEAKENED status
            for (const targetId of affectedUnitIds) {
              effects.push({
                unitId: targetId,
                statusApplied: 'WEAKENED'
              })
            }
          }
          break

        case DoctrineEffectType.HEAL:
          // Healing logic with special doctrine behaviors
          if (effect.target === DoctrineTarget.SELF) {
            const casterInUnits = updatedUnits.findIndex((u) => u.id === casterId)
            if (casterInUnits === -1) break

            const currentCaster = updatedUnits[casterInUnits]

            // TRANSFUSION: Sacrifice 2 health to restore 6 mana
            if (doctrineId === 'transfusion') {
              const healthCost = 2
              const manaRestore = effect.value || 6

              // Apply health cost
              const newHealth = Math.max(0, currentCaster.currentHealth - healthCost)
              updatedUnits[casterInUnits] = {
                ...currentCaster,
                currentHealth: newHealth
              }

              // Track mana restoration (handled by caller)
              manaRestored = manaRestore
              selfDamage = healthCost

              effects.push({
                unitId: casterId,
                damageDealt: healthCost
              })

              logEntries.push({
                timestamp: timestamp + 0.1,
                type: CombatLogType.DOCTRINE_EFFECT,
                data: { effect: 'transfusion', healthSacrificed: healthCost, manaRestored: manaRestore }
              })

              // Check if caster killed themselves
              if (newHealth <= 0) {
                effects.push({
                  unitId: casterId,
                  killed: true
                })
              }
            }
            // BATTLE_FERVOR: Roll dice, heal based on hits (up to value)
            else if (doctrineId === 'battle_fervor') {
              const maxHeal = effect.value || 3

              // Roll dice to determine healing (same mechanics as attack)
              const healDice = 3 // Roll 3 dice for healing
              const healRolls = this.rollDice(healDice)
              const { count: hits } = this.calculateHitsWithCount(healRolls, 4, 6)

              // Heal based on hits, capped at maxHeal
              const actualHeal = Math.min(hits, maxHeal)
              const newHealth = Math.min(currentCaster.maxHealth, currentCaster.currentHealth + actualHeal)

              updatedUnits[casterInUnits] = {
                ...currentCaster,
                currentHealth: newHealth
              }

              effects.push({
                unitId: casterId,
                healthRestored: actualHeal
              })

              logEntries.push({
                timestamp: timestamp + 0.1,
                type: CombatLogType.DOCTRINE_EFFECT,
                data: { effect: 'battle_fervor', dice: healDice, rolls: healRolls, hits, healAmount: actualHeal }
              })
            }
            // Standard healing
            else {
              const healAmount = effect.value || 0
              const newHealth = Math.min(currentCaster.maxHealth, currentCaster.currentHealth + healAmount)
              updatedUnits[casterInUnits] = {
                ...currentCaster,
                currentHealth: newHealth
              }

              effects.push({
                unitId: casterId,
                healthRestored: healAmount
              })

              logEntries.push({
                timestamp: timestamp + 0.1,
                type: CombatLogType.DOCTRINE_EFFECT,
                data: { effect: 'heal', value: healAmount }
              })
            }
          }
          break
      }
    }

    // Mark caster as having acted
    const casterUnitIndex = updatedUnits.findIndex((u) => u.id === casterId)
    if (casterUnitIndex !== -1) {
      updatedUnits[casterUnitIndex] = {
        ...updatedUnits[casterUnitIndex],
        hasActed: true
      }
    }

    // Update tiles to remove dead units
    const updatedTiles = state.tiles.map((row) => row.map((tile) => ({ ...tile })))
    for (const effect of effects) {
      if (effect.killed) {
        const killedUnit = updatedUnits.find((u) => u.id === effect.unitId)
        if (killedUnit) {
          const { x, y } = killedUnit.position
          if (updatedTiles[y]?.[x]) {
            updatedTiles[y][x].occupantId = null
          }
        }
      }
    }

    // Filter out dead units
    updatedUnits = updatedUnits.filter((u) => u.currentHealth > 0)

    // Update turn order to remove dead units
    const aliveUnitIds = new Set(updatedUnits.map((u) => u.id))
    const updatedTurnOrder = state.turnOrder.filter((unitId) => aliveUnitIds.has(unitId))

    // Adjust current turn index if needed
    let updatedCurrentTurnIndex = state.currentTurnIndex
    if (updatedCurrentTurnIndex >= updatedTurnOrder.length) {
      updatedCurrentTurnIndex = 0
    }

    // Create updated state
    const updatedState: TacticalStateData = {
      ...state,
      tiles: updatedTiles,
      units: updatedUnits,
      turnOrder: updatedTurnOrder,
      currentTurnIndex: updatedCurrentTurnIndex
    }

    // Save tactical state to database
    await this.activityParticipationRepository.updateTacticalState(participationId, updatedState)

    // Save combat log entries
    console.log(`[executeTacticalDoctrine] Attempting to save ${logEntries.length} log entries for participation ${participationId}`)
    console.log(`[executeTacticalDoctrine] combatEnemyRepository exists: ${!!this.combatEnemyRepository}`)

    if (this.combatEnemyRepository && logEntries.length > 0) {
      let activeEnemy = await this.combatEnemyRepository.getActiveEnemy(participationId)
      console.log(`[executeTacticalDoctrine] getActiveEnemy result: ${activeEnemy ? activeEnemy.id : 'null'}`)

      // Fallback: if no active enemy found by status, try finding by ID from tactical state
      if (!activeEnemy) {
        const enemyUnit = state.units.find((u) => !u.id.startsWith('player-'))
        console.log(`[executeTacticalDoctrine] Fallback - found enemy unit: ${enemyUnit ? enemyUnit.id : 'null'}`)
        if (enemyUnit) {
          activeEnemy = await this.combatEnemyRepository.findById(enemyUnit.id)
          console.log(`[executeTacticalDoctrine] findById result: ${activeEnemy ? activeEnemy.id : 'null'}`)
        }
      }

      if (activeEnemy) {
        await this.combatEnemyRepository.appendToCombatLog(activeEnemy.id, logEntries)
        console.log(`[executeTacticalDoctrine] Successfully appended log entries to enemy ${activeEnemy.id}`)
      } else {
        console.warn(`[executeTacticalDoctrine] No enemy found for participationId: ${participationId}. Combat log entries not saved.`)
      }
    } else {
      console.warn(`[executeTacticalDoctrine] Skipping log save - repo: ${!!this.combatEnemyRepository}, entries: ${logEntries.length}`)
    }

    return {
      success: true,
      casterId,
      doctrineId,
      targetPosition,
      affectedTiles,
      affectedUnitIds,
      effects,
      manaCost: doctrine.manaCost,
      updatedState,
      logEntries,
      manaRestored: manaRestored > 0 ? manaRestored : undefined,
      selfDamage: selfDamage > 0 ? selfDamage : undefined
    }
  }

  /**
   * Use a self-buff doctrine (like Stellar Collapse).
   * These doctrines don't require targeting - they apply buffs to the caster
   * that enhance their next attack.
   */
  async useSelfBuffDoctrine(
    participationId: string,
    casterId: string,
    doctrineId: string,
    casterMana: number
  ): Promise<{
    success: boolean
    doctrineId: string
    manaCost: number
    bonusDice: number
    logEntries: CombatLogEntry[]
  }> {
    // Get doctrine definition
    const doctrine = DOCTRINES[doctrineId]
    if (!doctrine) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Doctrine not found' })
    }

    // Validate this is a self-buff doctrine (POWER_MODIFIER, THRESHOLD_MODIFIER, NEGATE_HITS, or GUARANTEED_CRITICAL with SELF target, no aoePattern)
    // Special cases: karmic_retribution is a thorns buff (applied to self, triggers on being hit)
    const selfBuffEffectTypes: DoctrineEffectType[] = [
      DoctrineEffectType.POWER_MODIFIER,
      DoctrineEffectType.THRESHOLD_MODIFIER,
      DoctrineEffectType.NEGATE_HITS,
      DoctrineEffectType.GUARANTEED_CRITICAL
    ]
    // Doctrines that are self-buffs but don't fit the standard pattern
    const specialSelfBuffDoctrines = ['karmic_retribution']

    const isSelfBuff = (doctrine.effects.some(
      (e) => selfBuffEffectTypes.includes(e.type) && e.target === DoctrineTarget.SELF
    ) && !doctrine.aoePattern) || specialSelfBuffDoctrines.includes(doctrineId)

    if (!isSelfBuff) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'This doctrine requires targeting' })
    }

    // Validate mana
    if (casterMana < doctrine.manaCost) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Not enough mana' })
    }

    // Get current tactical state
    const participation = await this.activityParticipationRepository.findByIdWithTacticalState(participationId)

    if (!participation) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Participation not found' })
    }

    if (!participation.tacticalState || !participation.tacticalState.units) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'No tactical combat in progress' })
    }

    const state = participation.tacticalState

    // Find caster
    const casterIndex = state.units.findIndex((u) => u.id === casterId)
    if (casterIndex === -1) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Caster not found' })
    }

    // Check if it's the caster's turn
    const currentUnitId = state.turnOrder[state.currentTurnIndex]
    if (currentUnitId !== casterId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Not this unit\'s turn' })
    }

    // Get the buff values from the doctrine
    let bonusDice = 0
    let thresholdMod = 0
    let negateHits = 0
    let guaranteedCritical = false
    let criticalThresholdMod = 0

    for (const effect of doctrine.effects) {
      if (effect.target !== DoctrineTarget.SELF) continue
      const value = effect.value || 0

      switch (effect.type) {
        case DoctrineEffectType.POWER_MODIFIER:
          bonusDice += value
          break
        case DoctrineEffectType.THRESHOLD_MODIFIER:
          thresholdMod += value
          break
        case DoctrineEffectType.NEGATE_HITS:
          negateHits += value
          break
        case DoctrineEffectType.GUARANTEED_CRITICAL:
          if (value === 1) {
            guaranteedCritical = true
          } else if (value >= 2 && value <= 6) {
            // Lower critical threshold (e.g., 5 means 5+ is critical instead of 6+)
            criticalThresholdMod = 6 - value
          }
          break
      }
    }

    // Create the active doctrine effect
    const activeEffect: ActiveStatusEffect = {
      effect: StatusEffect.DOCTRINE_ACTIVE,
      remainingTurns: 1, // Lasts until next attack
      sourceDoctrineId: doctrineId
    }

    // Update unit's active doctrines
    const updatedUnits = state.units.map((unit, i) => {
      if (i === casterIndex) {
        const existingDoctrines = unit.activeDoctrines || {}
        return {
          ...unit,
          activeDoctrines: {
            ...existingDoctrines,
            [doctrineId]: activeEffect
          }
        }
      }
      return unit
    })

    const timestamp = Date.now()
    const logEntries: CombatLogEntry[] = []

    // Log doctrine activation
    logEntries.push({
      timestamp,
      type: CombatLogType.DOCTRINE_EFFECT,
      data: {
        doctrine: doctrineId,
        effect: bonusDice > 0 ? 'power_boost' : thresholdMod !== 0 ? 'threshold_reduction' : negateHits > 0 ? 'damage_negation' : guaranteedCritical ? 'guaranteed_critical' : 'buff',
        bonusDice,
        thresholdMod,
        negateHits,
        guaranteedCritical,
        criticalThresholdMod
      }
    })

    // Create updated state
    const updatedState: TacticalStateData = {
      ...state,
      units: updatedUnits
    }

    // Save tactical state to database
    await this.activityParticipationRepository.updateTacticalState(participationId, updatedState)

    // Save combat log entries
    console.log(`[useSelfBuffDoctrine] Attempting to save ${logEntries.length} log entries for participation ${participationId}`)
    console.log(`[useSelfBuffDoctrine] combatEnemyRepository exists: ${!!this.combatEnemyRepository}`)

    if (this.combatEnemyRepository && logEntries.length > 0) {
      let activeEnemy = await this.combatEnemyRepository.getActiveEnemy(participationId)
      console.log(`[useSelfBuffDoctrine] getActiveEnemy result: ${activeEnemy ? activeEnemy.id : 'null'}`)

      // Fallback: if no active enemy found by status, try finding by ID from tactical state
      if (!activeEnemy) {
        const enemyUnit = state.units.find((u) => !u.id.startsWith('player-'))
        console.log(`[useSelfBuffDoctrine] Fallback - found enemy unit: ${enemyUnit ? enemyUnit.id : 'null'}`)
        if (enemyUnit) {
          activeEnemy = await this.combatEnemyRepository.findById(enemyUnit.id)
          console.log(`[useSelfBuffDoctrine] findById result: ${activeEnemy ? activeEnemy.id : 'null'}`)
        }
      }

      if (activeEnemy) {
        await this.combatEnemyRepository.appendToCombatLog(activeEnemy.id, logEntries)
        console.log(`[useSelfBuffDoctrine] Successfully appended log entries to enemy ${activeEnemy.id}`)
      } else {
        console.warn(`[useSelfBuffDoctrine] No enemy found for participationId: ${participationId}. Combat log entries not saved.`)
      }
    } else {
      console.warn(`[useSelfBuffDoctrine] Skipping log save - repo: ${!!this.combatEnemyRepository}, entries: ${logEntries.length}`)
    }

    return {
      success: true,
      doctrineId,
      manaCost: doctrine.manaCost,
      bonusDice,
      logEntries
    }
  }

  /**
   * Get all active self-buff modifiers from doctrines on a unit.
   * Returns bonus dice, threshold modifiers, negate hits, and critical modifiers.
   */
  getActiveDoctrineBuffs(
    unitActiveDoctrines: Record<string, ActiveStatusEffect> | undefined,
    incomingHits?: number // Used to calculate percentage-based negation (fractal_invocation)
  ): {
    bonusDice: number
    sixesGenerateExtraHits: boolean
    thresholdMod: number
    negateHits: number
    guaranteedCritical: boolean
    criticalThresholdMod: number
    defenseZero: boolean
    onesHurtSelf: boolean
    thornsDamage: number // karmic_retribution: damage reflected to attacker
  } {
    if (!unitActiveDoctrines) {
      return {
        bonusDice: 0,
        sixesGenerateExtraHits: false,
        thresholdMod: 0,
        negateHits: 0,
        guaranteedCritical: false,
        criticalThresholdMod: 0,
        defenseZero: false,
        onesHurtSelf: false,
        thornsDamage: 0
      }
    }

    let bonusDice = 0
    let sixesGenerateExtraHits = false
    let thresholdMod = 0
    let negateHits = 0
    let guaranteedCritical = false
    let criticalThresholdMod = 0
    let defenseZero = false
    let onesHurtSelf = false
    let thornsDamage = 0

    // Doctrines that set defense to 0
    const defenseZeroDoctrines = ['reckless_strike', 'audacity']
    // Doctrines where rolling 1s hurts self
    const onesHurtSelfDoctrines = ['plasma_missile', 'audacity']

    for (const [doctrineId, effect] of Object.entries(unitActiveDoctrines)) {
      if (effect.remainingTurns <= 0) continue

      const doctrine = DOCTRINES[doctrineId]
      if (!doctrine) continue

      // Check for special doctrine behaviors
      if (defenseZeroDoctrines.includes(doctrineId)) {
        defenseZero = true
      }
      if (onesHurtSelfDoctrines.includes(doctrineId)) {
        onesHurtSelf = true
      }

      // KARMIC_RETRIBUTION: Thorns - deal flat damage to attacker
      if (doctrineId === 'karmic_retribution') {
        const thornEffect = doctrine.effects.find(e => e.thornsDamage !== undefined)
        if (thornEffect?.thornsDamage) {
          thornsDamage = thornEffect.thornsDamage
        }
      }

      // INSPIRATION: Check for pre-calculated bonus dice from scalesWithEnemyTier
      if (doctrineId === 'inspiration') {
        const bonusEntry = unitActiveDoctrines[`${doctrineId}_bonus`] as any
        if (bonusEntry?.calculatedBonusDice) {
          bonusDice += bonusEntry.calculatedBonusDice
          continue // Skip normal processing for this doctrine
        }
      }

      for (const doctrineEffect of doctrine.effects) {
        if (doctrineEffect.target !== DoctrineTarget.SELF) continue
        const value = doctrineEffect.value || 0

        switch (doctrineEffect.type) {
          case DoctrineEffectType.POWER_MODIFIER:
            bonusDice += value
            // Check if this effect has the sixesGenerateExtraHits property
            if (doctrineEffect.sixesGenerateExtraHits) {
              sixesGenerateExtraHits = true
            }
            break

          case DoctrineEffectType.THRESHOLD_MODIFIER:
            thresholdMod += value
            break

          case DoctrineEffectType.NEGATE_HITS:
            // FRACTAL_INVOCATION: value >= 50 && <= 100 means percentage-based (50 = 50%)
            // IRON_BASTION: value = 99 (negate all) should work as flat negation when used standalone
            if (value >= 50 && value <= 100 && incomingHits !== undefined) {
              // Negate percentage of incoming hits, rounded up
              const percentageNegate = Math.ceil(incomingHits * (value / 100))
              negateHits += percentageNegate
            } else {
              // Standard flat hit negation (includes iron_bastion's 99 when no incomingHits context)
              negateHits += value
            }
            break

          case DoctrineEffectType.GUARANTEED_CRITICAL:
            if (value === 1) {
              guaranteedCritical = true
            } else if (value >= 2 && value <= 6) {
              // Lower critical threshold (e.g., 5 means 5+ is critical instead of 6+)
              criticalThresholdMod = Math.max(criticalThresholdMod, 6 - value)
            }
            break
        }
      }
    }

    return {
      bonusDice,
      sixesGenerateExtraHits,
      thresholdMod,
      negateHits,
      guaranteedCritical,
      criticalThresholdMod,
      defenseZero,
      onesHurtSelf,
      thornsDamage
    }
  }

  /**
   * Clear consumed self-buff doctrines from a unit after an attack.
   * This clears POWER_MODIFIER, THRESHOLD_MODIFIER, and GUARANTEED_CRITICAL effects.
   * NEGATE_HITS are cleared separately after defense.
   */
  clearConsumedDoctrines(
    unitActiveDoctrines: Record<string, ActiveStatusEffect> | undefined,
    clearDefenseBuffs: boolean = false
  ): Record<string, ActiveStatusEffect> {
    if (!unitActiveDoctrines) {
      return {}
    }

    const remaining: Record<string, ActiveStatusEffect> = {}

    // Self-buff effect types that get consumed on attack
    const attackBuffTypes: DoctrineEffectType[] = [
      DoctrineEffectType.POWER_MODIFIER,
      DoctrineEffectType.THRESHOLD_MODIFIER,
      DoctrineEffectType.GUARANTEED_CRITICAL
    ]

    // Defense buff effect types that get consumed when taking damage
    const defenseBuffTypes: DoctrineEffectType[] = [
      DoctrineEffectType.NEGATE_HITS
    ]

    for (const [doctrineId, effect] of Object.entries(unitActiveDoctrines)) {
      const doctrine = DOCTRINES[doctrineId]

      // If doctrine is not found or is not a self-buff, preserve it if it has remaining turns
      if (!doctrine) {
        if (effect.remainingTurns > 0) {
          remaining[doctrineId] = effect
        }
        continue
      }

      // Check if this is an attack self-buff - these get consumed after attack
      const isAttackSelfBuff = doctrine.effects.some(
        (e) => attackBuffTypes.includes(e.type) && e.target === DoctrineTarget.SELF
      ) && !doctrine.aoePattern

      // Check if this is a defense self-buff - these get consumed after taking damage
      const isDefenseSelfBuff = doctrine.effects.some(
        (e) => defenseBuffTypes.includes(e.type) && e.target === DoctrineTarget.SELF
      ) && !doctrine.aoePattern

      if (isAttackSelfBuff) {
        // Attack self-buffs are consumed after attack
        continue
      }

      if (clearDefenseBuffs && isDefenseSelfBuff) {
        // Defense self-buffs are consumed after taking damage
        continue
      }

      // Other effects persist
      if (effect.remainingTurns > 0) {
        remaining[doctrineId] = effect
      }
    }

    return remaining
  }

  /**
   * Clear consumed defense buff doctrines from a unit after receiving damage.
   */
  clearConsumedDefenseDoctrines(
    unitActiveDoctrines: Record<string, ActiveStatusEffect> | undefined
  ): Record<string, ActiveStatusEffect> {
    return this.clearConsumedDoctrines(unitActiveDoctrines, true)
  }
}
