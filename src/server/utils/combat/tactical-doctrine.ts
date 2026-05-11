import { DOCTRINES, SELF_BUFF_EFFECT_TYPES, SPECIAL_SELF_BUFF_DOCTRINES } from '@shared/constants/doctrines'
import { getEnemy } from '@shared/constants/enemies'
import {
  DoctrineEffectType,
  DoctrineTarget,
  NEGATIVE_STATUSES,
  StatusEffect,
  type ActiveStatusEffect
} from '@shared/types/doctrine.types'
import type { CombatLogEntry } from '@shared/types/gamification.types'
import { CombatLogType } from '@shared/types/gamification.types'
import type { TacticalDoctrineResult, TacticalStateData } from '@shared/types/tactical-combat.types'
import { TRPCError } from '@trpc/server'

import { calculateHitsWithCount, getCurrentClassOrThrow, rollDice } from './dice'
import { processEnemyDefeat, type CombatRewardDeps, type CombatStateRepos } from './rewards'

/**
 * Execute a tactical doctrine action.
 * Applies doctrine effects to all targets in the AoE.
 */
export async function executeTacticalDoctrine(
  participationId: string,
  casterId: string,
  doctrineId: string,
  targeting: 'single' | 'all',
  targetIds: string[],
  casterMana: number,
  repos: CombatRewardDeps
): Promise<TacticalDoctrineResult> {
  // Get current tactical state
  const participation = await repos.characterQuestRepository.findByIdWithTacticalState(participationId)

  if (!participation) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Participation not found' })
  }

  if (!participation.tacticalState || !participation.tacticalState.units) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'No tactical combat in progress' })
  }

  const state = participation.tacticalState

  // Validate the doctrine action
  const caster = state.units.find((u) => u.id === casterId)
  if (!caster) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Caster not found in combat' })
  }

  if (state.turnOrder[state.currentTurnIndex] !== casterId) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: "Not this unit's turn" })
  }

  if (caster.hasActed) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Unit has already acted this turn' })
  }

  const doctrine = DOCTRINES[doctrineId]
  if (!doctrine) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Doctrine not found' })
  }

  if (casterMana < doctrine.manaCost) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Not enough mana' })
  }

  // Use targetIds directly as affected units
  const affectedUnitIds = targetIds

  const timestamp = Date.now()
  const logEntries: CombatLogEntry[] = []
  const effects: TacticalDoctrineResult['effects'] = []

  // Track special doctrine results
  let manaRestored = 0
  let selfDamage = 0

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

          // Apply AoE damage reduction for 'all' targeting
          if (targeting === 'all') {
            damage = Math.floor(damage * 0.6)
          }

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
              const enemyTemplate =
                getEnemy(targetUnit.name.split('|')[0]) || // Try to get from name
                state.units.find((u) => u.id === targetId) // Fallback
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
            const powerRolls = rollDice(powerDice)
            // Threshold 4+ to hit, 6s are criticals (generate extra hits)
            const { results: rollResults, count: hits } = calculateHitsWithCount(
              powerRolls,
              4, // Standard attack threshold
              6 // 6s are criticals
            )

            // Count extra hits from criticals (6s)
            const criticalCount = rollResults.filter((r) => r.isCritical).length
            let totalHits = hits + criticalCount // Criticals generate extra hits

            // Apply AoE damage reduction for 'all' targeting
            if (targeting === 'all') {
              totalHits = Math.floor(totalHits * 0.6)
            }

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
                logEntries.push({
                  timestamp: timestamp + 0.2,
                  type: CombatLogType.ENEMY_DEFEATED,
                  data: { enemy: target.name }
                })
              }
            }

            // (disintegration_ray mana refund removed — now uses DIRECT_DAMAGE instant kill)
          }
        } else if (effect.target === DoctrineTarget.ALL_ENEMIES || effect.target === DoctrineTarget.ENEMY) {
          // Bug 2 fix: Create real WEAKENED status effect on targets
          for (const targetId of affectedUnitIds) {
            const targetIdx = updatedUnits.findIndex((u) => u.id === targetId)
            if (targetIdx !== -1) {
              const targetUnit = updatedUnits[targetIdx]
              const weakenedEffect: ActiveStatusEffect = {
                effect: StatusEffect.WEAKENED,
                remainingTurns: effect.duration ?? 1,
                sourceDoctrineId: doctrineId,
                debuffType: effect.debuffType ?? 'defense',
                debuffValue: effect.value ?? 0
              }
              updatedUnits[targetIdx] = {
                ...targetUnit,
                activeEffects: [...(targetUnit.activeEffects || []), weakenedEffect]
              }
            }
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
            const healRolls = rollDice(healDice)
            const { count: hits } = calculateHitsWithCount(healRolls, 4, 6)

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

  // Filter out dead enemies, but keep dead players (for death dialog)
  updatedUnits = updatedUnits.filter((u) => u.id.startsWith('player-') || u.currentHealth > 0)

  // Update turn order to remove dead units (including dead players)
  const aliveUnitIds = new Set(updatedUnits.filter((u) => u.currentHealth > 0).map((u) => u.id))
  const updatedTurnOrder = state.turnOrder.filter((unitId) => aliveUnitIds.has(unitId))

  // Adjust current turn index if needed
  let updatedCurrentTurnIndex = state.currentTurnIndex
  if (updatedCurrentTurnIndex >= updatedTurnOrder.length) {
    updatedCurrentTurnIndex = 0
  }

  // Create updated state
  const updatedState: TacticalStateData = {
    ...state,
    units: updatedUnits,
    turnOrder: updatedTurnOrder,
    currentTurnIndex: updatedCurrentTurnIndex
  }

  // Save tactical state to database
  await repos.characterQuestRepository.updateTacticalState(participationId, updatedState)

  // Sync player health to CharacterClass if player's health changed (self-damage or healing)
  const playerHealthChanged =
    selfDamage > 0 || effects.some((e) => e.unitId === casterId && (e.damageDealt || e.healthRestored))
  if (playerHealthChanged && casterId.startsWith('player-') && participation.characterId) {
    const playerUnit = updatedState.units.find((u) => u.id === casterId)
    if (playerUnit) {
      const character = await repos.characterRepository.findByIdWithClasses(participation.characterId)
      if (character) {
        const currentClass = getCurrentClassOrThrow(character)
        await repos.characterRepository.updateHealth(currentClass.id, playerUnit.currentHealth, currentClass.mana)
      }
    }
  }

  // Handle enemy defeats and spawn next enemy
  let goldReward = 0
  let nextEnemy:
    | { id: string; templateId: string; name: string; currentHealth: number; maxHealth: number; currentMana: number; maxMana: number }
    | undefined
  let tierProgression: { oldTier: number; newTier: number } | undefined

  // Check if any enemy was killed
  const killedEnemyEffects = effects.filter((e) => e.killed && !e.unitId.startsWith('player-'))

  if (repos.combatEnemyRepository) {
    let activeEnemy = await repos.combatEnemyRepository.getActiveEnemy(participationId)

    // Fallback: if no active enemy found by status, try finding by ID from tactical state
    if (!activeEnemy) {
      const enemyUnit = state.units.find((u) => !u.id.startsWith('player-'))
      if (enemyUnit) {
        activeEnemy = await repos.combatEnemyRepository.findById(enemyUnit.id)
      }
    }

    if (activeEnemy) {
      // Append combat log entries
      await repos.combatEnemyRepository.appendToCombatLog(activeEnemy.id, logEntries)

      // Handle enemy defeat via unified processEnemyDefeat
      if (killedEnemyEffects.length > 0) {
        const killedIds = killedEnemyEffects.map((e) => e.unitId)
        const defeatResult = await processEnemyDefeat(participationId, updatedState, killedIds, repos)
        goldReward = defeatResult.goldReward
        nextEnemy = defeatResult.nextEnemy
        tierProgression = defeatResult.tierProgression
      }
    }
  }

  return {
    success: true,
    casterId,
    doctrineId,
    targeting,
    affectedUnitIds,
    effects,
    manaCost: doctrine.manaCost,
    updatedState,
    logEntries,
    manaRestored: manaRestored > 0 ? manaRestored : undefined,
    selfDamage: selfDamage > 0 ? selfDamage : undefined,
    goldReward: goldReward > 0 ? goldReward : undefined,
    nextEnemy,
    tierProgression
  }
}

/**
 * Use a self-buff doctrine (like Stellar Collapse).
 * These doctrines don't require targeting - they apply buffs to the caster
 * that enhance their next attack.
 */
export async function useSelfBuffDoctrine(
  participationId: string,
  casterId: string,
  doctrineId: string,
  casterMana: number,
  repos: CombatStateRepos
): Promise<{
  success: boolean
  doctrineId: string
  manaCost: number
  bonusDice: number
  logEntries: CombatLogEntry[]
  updatedState: TacticalStateData
}> {
  // Get doctrine definition
  const doctrine = DOCTRINES[doctrineId]
  if (!doctrine) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Doctrine not found' })
  }

  // Validate this is a self-buff doctrine
  const isSelfBuff =
    (doctrine.effects.some((e) => SELF_BUFF_EFFECT_TYPES.includes(e.type) && e.target === DoctrineTarget.SELF) &&
      !doctrine.effects.some((e) => e.target === DoctrineTarget.ENEMY || e.target === DoctrineTarget.ALL_ENEMIES)) ||
    SPECIAL_SELF_BUFF_DOCTRINES.includes(doctrineId)

  if (!isSelfBuff) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'This doctrine requires targeting' })
  }

  // Validate mana
  if (casterMana < doctrine.manaCost) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Not enough mana' })
  }

  // Get current tactical state
  const participation = await repos.characterQuestRepository.findByIdWithTacticalState(participationId)

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
    throw new TRPCError({ code: 'BAD_REQUEST', message: "Not this unit's turn" })
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

  // Determine duration from doctrine effects (default 1 for single-use buffs)
  const effectDuration = doctrine.effects.reduce((max, e) => Math.max(max, e.duration || 0), 0) || 1

  // Create the active doctrine effect
  const activeEffect: ActiveStatusEffect = {
    effect: StatusEffect.DOCTRINE_ACTIVE,
    remainingTurns: effectDuration,
    sourceDoctrineId: doctrineId
  }

  // Bug 1 fix: For mixed SELF+ENEMY doctrines (shoulder_charge, righteous_charge, law_hammer),
  // scan for APPLY_STATUS(ENEMY) effects and store as pending enemy status
  for (const docEffect of doctrine.effects) {
    if (
      docEffect.target === DoctrineTarget.ENEMY &&
      docEffect.type === DoctrineEffectType.APPLY_STATUS &&
      docEffect.statusEffect
    ) {
      activeEffect.pendingEnemyStatus = docEffect.statusEffect
      activeEffect.pendingEnemyStatusDuration = docEffect.duration || 1
      break
    }
  }

  // Bug 4 fix: nullify — prepare cleansed effects for caster
  const shouldCleanse = doctrineId === 'nullify'

  // Update unit's active doctrines
  const updatedUnits = state.units.map((unit, i) => {
    if (i === casterIndex) {
      const existingDoctrines = unit.activeDoctrines || {}
      // Apply nullify cleanse if applicable
      const cleansedEffects = shouldCleanse
        ? (unit.activeEffects || []).filter((eff) => !NEGATIVE_STATUSES.includes(eff.effect))
        : unit.activeEffects
      return {
        ...unit,
        activeEffects: cleansedEffects,
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
      effect:
        bonusDice > 0
          ? 'power_boost'
          : thresholdMod !== 0
            ? 'threshold_reduction'
            : negateHits > 0
              ? 'damage_negation'
              : guaranteedCritical
                ? 'guaranteed_critical'
                : 'buff',
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
  await repos.characterQuestRepository.updateTacticalState(participationId, updatedState)

  // Save combat log entries
  if (repos.combatEnemyRepository && logEntries.length > 0) {
    let activeEnemy = await repos.combatEnemyRepository.getActiveEnemy(participationId)

    // Fallback: if no active enemy found by status, try finding by ID from tactical state
    if (!activeEnemy) {
      const enemyUnit = state.units.find((u) => !u.id.startsWith('player-'))
      if (enemyUnit) {
        activeEnemy = await repos.combatEnemyRepository.findById(enemyUnit.id)
      }
    }

    if (activeEnemy) {
      await repos.combatEnemyRepository.appendToCombatLog(activeEnemy.id, logEntries)
    }
  }

  return {
    success: true,
    doctrineId,
    manaCost: doctrine.manaCost,
    bonusDice,
    logEntries,
    updatedState
  }
}
