import { StatusEffect, type ActiveStatusEffect } from '@shared/types/doctrine.types'
import type {
  CombatLogEntry,
  DiceRollResult
} from '@shared/types/gamification.types'
import { CombatLogType } from '@shared/types/gamification.types'
import type {
  GridPosition,
  TacticalStateData,
  EnemyTurnResult
} from '@shared/types/tactical-combat.types'
import { TRPCError } from '@trpc/server'

import { rollDice, calculateHitsWithCount, getCurrentClassOrThrow } from './dice'
import { getActiveDoctrineBuffs, clearConsumedDefenseDoctrines } from './doctrine-buffs'
import {
  getManhattanDistance,
  findClosestPlayer,
  calculateMovementRange,
  findBestMoveTowardTarget
} from './movement'
import type { CombatStateRepos } from './rewards'

/**
 * Execute an enemy AI turn.
 * Decision tree:
 * 1. If player in attack range -> attack
 * 2. Otherwise, move toward player
 * 3. After moving, if player in attack range -> attack
 * 4. End turn
 */
export async function executeEnemyTurn(
  participationId: string,
  enemyId: string,
  enemyMovementRange: number,
  enemyAttackRange: number,
  enemyAttackDice: number,
  enemyAttackThreshold: number,
  repos: CombatStateRepos
): Promise<EnemyTurnResult> {
  // Get current tactical state
  const participation = await repos.activityParticipationRepository.findByIdWithTacticalState(participationId)

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

  // Process status effects at the start of enemy's turn (BURNING, POISONED, PURIFIED)
  let statusEffectDamage = 0
  let diedFromStatusEffect = false
  const enemyForStatusCheck = state.units[enemyIndex]
  if (enemyForStatusCheck.activeEffects && enemyForStatusCheck.activeEffects.length > 0) {
    // Look up enemy template to check for demon immunity
    let isDemon = false
    if (repos.combatEnemyRepository) {
      const combatEnemy = await repos.combatEnemyRepository.findById(enemyId)
      isDemon = combatEnemy?.templateId?.includes('demon') ?? false
    }

    // Check for damage-over-time effects
    for (const effect of enemyForStatusCheck.activeEffects) {
      if (effect.effect === StatusEffect.BURNING && !isDemon) {
        statusEffectDamage += 1
      } else if (effect.effect === StatusEffect.PURIFIED) {
        statusEffectDamage += 1
      } else if (effect.effect === StatusEffect.POISONED) {
        statusEffectDamage += 2
      }
    }
    if (statusEffectDamage > 0) {
      const newEnemyHealth = Math.max(0, enemyForStatusCheck.currentHealth - statusEffectDamage)
      diedFromStatusEffect = newEnemyHealth <= 0

      // Decrement remaining turns and remove expired effects
      const updatedEffects = enemyForStatusCheck.activeEffects
        .map((e) => ({ ...e, remainingTurns: e.remainingTurns - 1 }))
        .filter((e) => e.remainingTurns > 0)

      // Update state with damage and decremented effects
      state = {
        ...state,
        units: state.units.map((unit, i) => {
          if (i === enemyIndex) {
            return {
              ...unit,
              currentHealth: newEnemyHealth,
              activeEffects: updatedEffects
            }
          }
          return unit
        })
      }

      // Log the status effect damage
      logEntries.push({
        timestamp,
        type: CombatLogType.DAMAGE_TO_ENEMY,
        data: { damage: statusEffectDamage, source: 'status_effect' }
      })

      if (diedFromStatusEffect) {
        logEntries.push({
          timestamp: timestamp + 1,
          type: CombatLogType.ENEMY_DEFEATED,
          data: { enemyId }
        })
      }
    } else {
      // No damage, but still decrement and clean up expired effects
      const updatedEffects = enemyForStatusCheck.activeEffects
        .map((e) => ({ ...e, remainingTurns: e.remainingTurns - 1 }))
        .filter((e) => e.remainingTurns > 0)

      state = {
        ...state,
        units: state.units.map((unit, i) => {
          if (i === enemyIndex) {
            return { ...unit, activeEffects: updatedEffects }
          }
          return unit
        })
      }
    }
  }

  // If enemy died from status effect, skip their turn
  if (diedFromStatusEffect) {
    // Remove dead enemy from tiles and turn order
    const deadEnemy = state.units[enemyIndex]
    const updatedTiles = state.tiles.map((row) => row.map((tile) => ({ ...tile })))
    if (updatedTiles[deadEnemy.position.y]?.[deadEnemy.position.x]) {
      updatedTiles[deadEnemy.position.y][deadEnemy.position.x].occupantId = null
    }

    const updatedUnits = state.units.filter((u) => u.currentHealth > 0)
    const updatedTurnOrder = state.turnOrder.filter((id) => {
      const unit = updatedUnits.find((u) => u.id === id)
      return unit && unit.currentHealth > 0
    })

    state = {
      ...state,
      tiles: updatedTiles,
      units: updatedUnits,
      turnOrder: updatedTurnOrder
    }

    // Save state to database
    await repos.activityParticipationRepository.updateTacticalState(participationId, state)

    // Save combat log
    if (repos.combatEnemyRepository && logEntries.length > 0) {
      const activeEnemy = await repos.combatEnemyRepository.getActiveEnemy(participationId)
      if (activeEnemy) {
        await repos.combatEnemyRepository.appendToCombatLog(activeEnemy.id, logEntries)
      }
    }

    return {
      success: true,
      enemyId,
      action: 'wait',
      moved: false,
      attacked: false,
      updatedState: state,
      logEntries,
      statusEffectDamage,
      diedFromStatusEffect
    }
  }

  // Update enemy reference after state change
  const enemy = state.units.find((u) => u.id === enemyId)!

  // Find closest player
  const targetPlayer = findClosestPlayer(enemy.position, state.units)
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
  const initialDistance = getManhattanDistance(enemy.position, targetPlayer.position)
  const inAttackRange = initialDistance <= enemyAttackRange

  // If not in attack range and can move, move toward player
  if (!inAttackRange && !enemy.hasMoved) {
    const movementTiles = calculateMovementRange(
      enemy.position,
      enemyMovementRange,
      state.tiles,
      state.units,
      false // enemy is not a player
    )

    const moveResult = findBestMoveTowardTarget(
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
    ? getManhattanDistance(currentEnemy.position, currentTarget.position)
    : Infinity

  // Attack if in range and haven't acted
  if (distanceAfterMove <= enemyAttackRange && !currentEnemy.hasActed && currentTarget) {
    attacked = true
    targetId = targetPlayer.id

    // Bug 2 fix: Check enemy's activeEffects for WEAKENED(attack) debuff
    // Multiple WEAKENED(attack) effects stack additively (each reduces dice further)
    let effectiveEnemyAttackDice = enemyAttackDice
    if (currentEnemy.activeEffects) {
      for (const statusEff of currentEnemy.activeEffects) {
        if (statusEff.effect === StatusEffect.WEAKENED && statusEff.debuffType === 'attack' && statusEff.debuffValue != null && statusEff.remainingTurns > 0) {
          effectiveEnemyAttackDice = Math.max(0, effectiveEnemyAttackDice + statusEff.debuffValue) // debuffValue is negative
        }
      }
    }

    // Roll attack dice
    const attackRolls = rollDice(effectiveEnemyAttackDice)
    const { results: attackResults, count: attackHits } = calculateHitsWithCount(
      attackRolls,
      enemyAttackThreshold
    )
    attackerRolls = attackResults

    // Bug 6 fix: Check player's doctrine buffs for defenseZero
    const playerBuffs = getActiveDoctrineBuffs(currentTarget.activeDoctrines)
    const playerDefenseDice = playerBuffs.defenseZero ? 0 : 2
    const defenseRollValues = rollDice(playerDefenseDice)
    const { results: defenseResults, count: defenseBlocks } = calculateHitsWithCount(
      defenseRollValues,
      4 // Standard defense threshold
    )
    defenderRolls = defenseResults

    // Check for NEGATE_HITS on the player (pass raw damage for percentage-based negation)
    const rawPlayerDamage = Math.max(0, attackHits - defenseBlocks)
    const playerDefenseBuffs = getActiveDoctrineBuffs(currentTarget.activeDoctrines, rawPlayerDamage)
    const totalPlayerBlocks = defenseBlocks + playerDefenseBuffs.negateHits

    // Calculate damage
    damageDealt = Math.max(0, attackHits - totalPlayerBlocks)
    const newTargetHealth = Math.max(0, currentTarget.currentHealth - damageDealt)
    targetKilled = newTargetHealth <= 0

    logEntries.push({
      timestamp: timestamp + 2,
      type: CombatLogType.ENEMY_ATTACKS,
      data: { enemy: enemy.name, hits: attackHits, dice: effectiveEnemyAttackDice }
    })

    logEntries.push({
      timestamp: timestamp + 3,
      type: CombatLogType.PLAYER_DEFENDS,
      data: { blocks: defenseBlocks, rolls: defenseRollValues, negatedHits: playerDefenseBuffs.negateHits > 0 ? playerDefenseBuffs.negateHits : undefined }
    })

    logEntries.push({
      timestamp: timestamp + 4,
      type: CombatLogType.DAMAGE_TO_PLAYER,
      data: { damage: damageDealt }
    })

    // Bug 6 fix: Apply thorns damage from player's doctrines back to enemy
    let thornsDamageToEnemy = 0
    if (damageDealt > 0 && playerBuffs.thornsDamage > 0) {
      thornsDamageToEnemy = playerBuffs.thornsDamage
      logEntries.push({
        timestamp: timestamp + 4.5,
        type: CombatLogType.DOCTRINE_EFFECT,
        data: {
          effect: 'thorns',
          damage: thornsDamageToEnemy,
          source: 'thorns_retaliation'
        }
      })
    }

    // Calculate new enemy health after thorns
    const newEnemyHealthAfterThorns = Math.max(0, currentEnemy.currentHealth - thornsDamageToEnemy)
    const enemyKilledByThorns = newEnemyHealthAfterThorns <= 0

    // Bug 6 fix: Apply BURNING to enemy from thornsBurnDuration (flaming_apotheosis)
    let enemyBurnApplied = false
    if (damageDealt > 0 && playerBuffs.thornsBurnDuration > 0) {
      enemyBurnApplied = true
    }

    // Update state with attack result
    let updatedUnits = state.units.map((unit) => {
      if (unit.id === enemyId) {
        let enemyEffects = [...(unit.activeEffects || [])]
        // Apply BURNING from thorns if applicable
        if (enemyBurnApplied) {
          enemyEffects.push({
            effect: StatusEffect.BURNING,
            remainingTurns: playerBuffs.thornsBurnDuration,
            sourceDoctrineId: 'flaming_apotheosis'
          })
        }
        return {
          ...unit,
          hasActed: true,
          currentHealth: newEnemyHealthAfterThorns,
          activeEffects: enemyEffects
        }
      }
      if (unit.id === targetId) {
        return {
          ...unit,
          currentHealth: newTargetHealth,
          // Clear consumed defense buffs after taking damage
          activeDoctrines: (damageDealt ?? 0) > 0 || playerDefenseBuffs.negateHits > 0
            ? clearConsumedDefenseDoctrines(unit.activeDoctrines)
            : unit.activeDoctrines
        }
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
      // Keep dead players (for death dialog), but remove dead enemies
      updatedUnits = updatedUnits.filter((u) => u.id.startsWith('player-') || u.currentHealth > 0)

      logEntries.push({
        timestamp: timestamp + 5,
        type: CombatLogType.PLAYER_DEFEATED,
        data: { player: currentTarget.name }
      })
    }

    // Handle enemy killed by thorns
    if (enemyKilledByThorns) {
      const enemyPos = currentEnemy.position
      if (updatedTiles[enemyPos.y]?.[enemyPos.x]) {
        updatedTiles[enemyPos.y][enemyPos.x].occupantId = null
      }
      // Remove the killed enemy (health already set to 0 above via newEnemyHealthAfterThorns)
      updatedUnits = updatedUnits.filter((u) => u.id !== enemyId)
      logEntries.push({
        timestamp: timestamp + 5.5,
        type: CombatLogType.ENEMY_DEFEATED,
        data: { enemy: enemy.name }
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
    const character = await repos.characterRepository.findByIdWithClasses(participation.characterId)
    if (character) {
      const currentClass = getCurrentClassOrThrow(character)
      const currentMana = currentClass.mana
      const maxMana = currentClass.maxMana
      const baseRegen = 1 // Base mana regeneration per round

      if (currentMana < maxMana) {
        manaRegenerated = Math.min(baseRegen, maxMana - currentMana)
        await repos.characterRepository.updateHealth(
          currentClass.id,
          currentClass.health,
          currentMana + manaRegenerated
        )
      }
    }
  }

  // Save state to database
  await repos.activityParticipationRepository.updateTacticalState(participationId, state)

  // Sync player health to CharacterClass if player took damage from enemy attack
  if (attacked && damageDealt && damageDealt > 0 && participation.characterId) {
    const playerUnit = state.units.find((u) => u.id.startsWith('player-'))
    if (playerUnit) {
      const character = await repos.characterRepository.findByIdWithClasses(participation.characterId)
      if (character) {
        const currentClass = getCurrentClassOrThrow(character)
        await repos.characterRepository.updateHealth(currentClass.id, playerUnit.currentHealth, currentClass.mana)
      }
    }
  }

  // Save combat log entries and update stats
  if (repos.combatEnemyRepository) {
    const activeEnemy = await repos.combatEnemyRepository.getActiveEnemy(participationId)
    if (activeEnemy) {
      if (logEntries.length > 0) {
        await repos.combatEnemyRepository.appendToCombatLog(activeEnemy.id, logEntries)
      }
      // Track damageTaken (damage enemy dealt to player) and turnsElapsed
      const shouldUpdateStats = (damageDealt && damageDealt > 0) || isNewRound
      if (shouldUpdateStats) {
        await repos.combatEnemyRepository.updateEnemy(activeEnemy.id, {
          damageTaken: damageDealt && damageDealt > 0 ? damageDealt : undefined,
          turnsElapsed: isNewRound ? 1 : undefined
        })
      }
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
    manaRegenerated,
    statusEffectDamage: statusEffectDamage > 0 ? statusEffectDamage : undefined,
    diedFromStatusEffect: diedFromStatusEffect || undefined
  }
}
