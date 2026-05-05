import { StatusEffect, type ActiveStatusEffect } from '@shared/types/doctrine.types'
import type { CombatLogEntry } from '@shared/types/gamification.types'
import { CombatLogType } from '@shared/types/gamification.types'
import type {
  AttackValidationResult,
  TacticalAttackResult,
  TacticalStateData
} from '@shared/types/tactical-combat.types'
import { TRPCError } from '@trpc/server'
import { calculateHitsWithCount, getCurrentClassOrThrow } from './dice'
import { clearConsumedDefenseDoctrines, clearConsumedDoctrines, getActiveDoctrineBuffs } from './doctrine-buffs'
import { processEnemyDefeat, type CombatRewardDeps } from './rewards'

/**
 * Validate a tactical attack action.
 * Checks attacker/target existence, turn order, and acted status.
 */
export function validateTacticalAttack(
  state: TacticalStateData,
  attackerId: string,
  targetId: string
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
    return { valid: false, reason: "Not this unit's turn" }
  }

  // Check if attacker has already acted
  if (attackerState.hasActed) {
    return { valid: false, reason: 'Unit has already acted this turn' }
  }

  return { valid: true }
}

/**
 * Execute a tactical attack action.
 * Uses dice rolling to resolve combat and updates the tactical state.
 */
export async function executeTacticalAttack(
  participationId: string,
  attackerId: string,
  targetId: string,
  attackerRolls: number[],
  defenderRolls: number[],
  attackThreshold: number,
  defenseThreshold: number,
  attackCriticalThreshold: number = 6,
  repos: CombatRewardDeps
): Promise<TacticalAttackResult> {
  // Get current tactical state
  const participation = await repos.characterQuestRepository.findByIdWithTacticalState(participationId)

  if (!participation) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Participation not found' })
  }

  if (
    !participation.tacticalState ||
    !participation.tacticalState.units ||
    !Array.isArray(participation.tacticalState.units)
  ) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'No tactical combat in progress'
    })
  }

  const state = participation.tacticalState

  // Validate the attack
  const validation = validateTacticalAttack(state, attackerId, targetId)

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
  const buffs = getActiveDoctrineBuffs(attackerUnit.activeDoctrines)

  // Log doctrine buff if active
  if (buffs.bonusDice > 0 || buffs.thresholdMod !== 0 || buffs.guaranteedCritical || buffs.criticalThresholdMod > 0) {
    // Find the source doctrine ID(s) that contributed these buffs
    const sourceDoctrineIds = Object.keys(attackerUnit.activeDoctrines || {}).filter((docId) => {
      const effect = attackerUnit.activeDoctrines?.[docId]
      return effect && effect.remainingTurns > 0 && !docId.includes('_bonus')
    })
    const sourceDoctrineId = sourceDoctrineIds[0] || 'unknown'

    logEntries.push({
      timestamp: timestamp + 0.5,
      type: CombatLogType.DOCTRINE_EFFECT,
      data: {
        doctrine: sourceDoctrineId,
        effect: buffs.guaranteedCritical
          ? 'guaranteed_critical'
          : buffs.thresholdMod !== 0
            ? 'threshold_reduction'
            : 'power_boost',
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
  const { results: attackerResults, count: baseAttackerHits } = calculateHitsWithCount(
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

  // Bug 2 fix: Check defender for WEAKENED(defense) debuff — truncate effective defense rolls
  // Multiple WEAKENED(defense) effects stack additively (each reduces dice further)
  const defenderActiveEffects = state.units[targetIndex].activeEffects
  let effectiveDefenderRolls = defenderRolls
  if (defenderActiveEffects) {
    for (const statusEff of defenderActiveEffects) {
      if (
        statusEff.effect === StatusEffect.WEAKENED &&
        statusEff.debuffType === 'defense' &&
        statusEff.debuffValue != null &&
        statusEff.remainingTurns > 0
      ) {
        const reducedCount = Math.max(0, effectiveDefenderRolls.length + statusEff.debuffValue) // debuffValue is negative
        effectiveDefenderRolls = effectiveDefenderRolls.slice(0, reducedCount)
      }
    }
  }

  // Resolve defender's defense first to know total incoming hits
  const { results: defenderResults, count: defenderBlocks } = calculateHitsWithCount(
    effectiveDefenderRolls,
    defenseThreshold
  )

  // Calculate raw damage before defense buffs (for percentage-based negation)
  const rawDamage = Math.max(0, attackerHits - defenderBlocks)

  // Check for NEGATE_HITS buff on defender (if defender is a player unit)
  // Pass incoming hits for percentage-based negation (fractal_invocation)
  const defenderUnit = state.units[targetIndex]
  const defenderBuffs = getActiveDoctrineBuffs(defenderUnit.activeDoctrines, rawDamage)

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

  // Bug 1 fix: Collect pending enemy statuses from attacker's mixed SELF+ENEMY doctrines
  // Design: pending statuses only apply when the attack deals damage (must land a hit to stun, etc.)
  const pendingEnemyStatuses: ActiveStatusEffect[] = []
  if (damageToTarget > 0 && attackerUnit.activeDoctrines) {
    for (const [, docEffect] of Object.entries(attackerUnit.activeDoctrines)) {
      if (docEffect.pendingEnemyStatus && docEffect.remainingTurns > 0) {
        pendingEnemyStatuses.push({
          effect: docEffect.pendingEnemyStatus,
          remainingTurns: docEffect.pendingEnemyStatusDuration || 1,
          sourceDoctrineId: docEffect.sourceDoctrineId
        })
        logEntries.push({
          timestamp: timestamp + 3.7,
          type: CombatLogType.DOCTRINE_EFFECT,
          data: {
            effect: 'status_applied',
            status: docEffect.pendingEnemyStatus,
            target: enemyName,
            source: docEffect.sourceDoctrineId
          }
        })
      }
    }
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

  let damageToAttacker = 0
  let attackerKilled = false

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
        activeDoctrines: clearConsumedDoctrines(unit.activeDoctrines)
      }
    }
    if (i === targetIndex) {
      // Bug 1 fix: Apply pending enemy statuses (e.g. STUNNED from shoulder_charge)
      const updatedEffects =
        pendingEnemyStatuses.length > 0 ? [...(unit.activeEffects || []), ...pendingEnemyStatuses] : unit.activeEffects
      return {
        ...unit,
        currentHealth: newTargetHealth,
        activeEffects: updatedEffects,
        // Clear defense buffs (NEGATE_HITS) from defender after they take damage
        activeDoctrines:
          damageToTarget > 0 || defenderBuffs.negateHits > 0
            ? clearConsumedDefenseDoctrines(unit.activeDoctrines)
            : unit.activeDoctrines
      }
    }
    return unit
  })

  if (attackerKilled) {
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
  // Keep dead players (for death dialog), but remove dead enemies
  const updatedState: TacticalStateData = {
    ...state,
    units: updatedUnits.filter((u) => u.id.startsWith('player-') || u.currentHealth > 0),
    turnOrder: updatedTurnOrder,
    currentTurnIndex: updatedCurrentTurnIndex
  }

  // Save tactical state to database
  await repos.characterQuestRepository.updateTacticalState(participationId, updatedState)

  // Sync player health to CharacterClass if player took damage (thorns, self-damage from 1s)
  if (damageToAttacker > 0 && attackerUnit.id.startsWith('player-') && participation?.characterId) {
    const character = await repos.characterRepository.findByIdWithClasses(participation.characterId)
    if (character) {
      const currentClass = getCurrentClassOrThrow(character)
      await repos.characterRepository.updateHealth(currentClass.id, newAttackerHealth, currentClass.mana)
    }
  }

  // Sync CombatEnemy record and handle defeat
  let goldReward = 0
  let nextEnemy: { id: string; templateId: string; name: string; currentHealth: number; maxHealth: number } | undefined
  let tierProgression: { oldTier: number; newTier: number } | undefined

  if (repos.combatEnemyRepository) {
    const activeEnemy = await repos.combatEnemyRepository.getActiveEnemy(participationId)
    if (activeEnemy) {
      // Append combat log entries
      await repos.combatEnemyRepository.appendToCombatLog(activeEnemy.id, logEntries)

      // Update enemy health in database
      // Track damageDealt (damage player dealt to enemy), criticalHits, and damageTaken (damage from thorns/self-damage)
      const playerCriticalHits = attackerResults.filter((r) => r.isCritical).length
      await repos.combatEnemyRepository.updateEnemy(activeEnemy.id, {
        currentHealth: newTargetHealth,
        damageDealt: damageToTarget,
        criticalHits: playerCriticalHits,
        damageTaken: damageToAttacker > 0 ? damageToAttacker : undefined
      })

      // Handle enemy defeat via unified processEnemyDefeat
      if (targetKilled) {
        const defeatResult = await processEnemyDefeat(participationId, updatedState, [targetId], repos)
        goldReward = defeatResult.goldReward
        nextEnemy = defeatResult.nextEnemy
        tierProgression = defeatResult.tierProgression
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
    logEntries,
    goldReward,
    nextEnemy,
    selfDamageFromOnes: selfDamageFromOnes > 0 ? selfDamageFromOnes : undefined,
    tierProgression
  }
}
