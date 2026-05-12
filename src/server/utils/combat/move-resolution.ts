import { ABILITIES, isDamageMove } from '@shared/constants/abilities'
import {
  AbilityEffectType,
  AbilityTarget,
  NEGATIVE_STATUSES,
  StatusEffect,
  type ActiveStatusEffect
} from '@shared/types/ability.types'
import type { CharacterClassType, CharacterWithClasses } from '@shared/types/character.types'
import { CombatLogType, type CombatLogEntry } from '@shared/types/gamification.types'
import type {
  MoveEffectResult,
  TacticalMoveResult,
  TacticalStateData,
  TacticalUnitState
} from '@shared/types/tactical-combat.types'
import { TRPCError } from '@trpc/server'

import { getUnitTier, resolveDamageMove } from './combat-formula'
import { processEnemyDefeat, type CombatRewardDeps } from './rewards'

function findCurrentClass(character: CharacterWithClasses): CharacterClassType {
  const c = character.classes.find((cl) => cl.className === character.currentClass)
  if (!c) {
    throw new TRPCError({ code: 'NOT_FOUND', message: `Character class ${character.currentClass} not found` })
  }
  return c
}

function withUpdated(state: TacticalStateData, idx: number, update: Partial<TacticalUnitState>): TacticalUnitState[] {
  return state.units.map((u, i) => (i === idx ? { ...u, ...update } : u))
}

function findUnitIndex(state: TacticalStateData, unitId: string): number {
  return state.units.findIndex((u) => u.id === unitId)
}

function applyAppliedStatusToTarget(
  state: TacticalStateData,
  targetId: string,
  effect: StatusEffect,
  duration: number,
  sourceMoveId: string
): TacticalStateData {
  const idx = findUnitIndex(state, targetId)
  if (idx < 0) return state
  const existing = state.units[idx].activeEffects ?? []
  const next: ActiveStatusEffect = {
    effect,
    remainingTurns: duration,
    sourceAbilityId: sourceMoveId
  }
  return { ...state, units: withUpdated(state, idx, { activeEffects: [...existing, next] }) }
}

function applyDebuffActiveAbilityToTarget(
  state: TacticalStateData,
  targetId: string,
  abilityId: string,
  duration: number
): TacticalStateData {
  const idx = findUnitIndex(state, targetId)
  if (idx < 0) return state
  const existing = state.units[idx].activeAbilities ?? {}
  return {
    ...state,
    units: withUpdated(state, idx, {
      activeAbilities: {
        ...existing,
        [abilityId]: {
          effect: StatusEffect.ABILITY_ACTIVE,
          remainingTurns: duration,
          sourceAbilityId: abilityId
        }
      }
    })
  }
}

function applySelfBuffActiveAbility(
  state: TacticalStateData,
  casterId: string,
  abilityId: string,
  duration: number
): TacticalStateData {
  const idx = findUnitIndex(state, casterId)
  if (idx < 0) return state
  const existing = state.units[idx].activeAbilities ?? {}
  return {
    ...state,
    units: withUpdated(state, idx, {
      activeAbilities: {
        ...existing,
        [abilityId]: {
          effect: StatusEffect.ABILITY_ACTIVE,
          remainingTurns: duration,
          sourceAbilityId: abilityId
        }
      }
    })
  }
}

function cleanseDebuffs(state: TacticalStateData, casterId: string): TacticalStateData {
  const idx = findUnitIndex(state, casterId)
  if (idx < 0) return state
  const filtered = (state.units[idx].activeEffects ?? []).filter((e) => !NEGATIVE_STATUSES.includes(e.effect))
  return { ...state, units: withUpdated(state, idx, { activeEffects: filtered }) }
}

function dropExpiredBuffs(unit: TacticalUnitState): TacticalUnitState {
  if (!unit.activeAbilities) return unit
  const next: Record<string, ActiveStatusEffect> = {}
  for (const [id, eff] of Object.entries(unit.activeAbilities)) {
    if (eff.remainingTurns > 1) {
      next[id] = { ...eff, remainingTurns: eff.remainingTurns - 1 }
    }
  }
  return { ...unit, activeAbilities: next }
}

function decrementStatusEffects(unit: TacticalUnitState): TacticalUnitState {
  if (!unit.activeEffects?.length) return unit
  const next = unit.activeEffects
    .map((e) => ({ ...e, remainingTurns: e.remainingTurns - 1 }))
    .filter((e) => e.remainingTurns > 0)
  return { ...unit, activeEffects: next }
}

/**
 * Execute a Pokémon-style move (formerly `executeTacticalAttack` + `executeTacticalAbility`).
 *
 * Flow:
 *   1. Validate ownership, mana, turn.
 *   2. Deduct mana.
 *   3. If move has `power` → compute damage via combat-formula for each target.
 *   4. Apply side-effects (status, debuffs, self buffs, thorns shield, Protect, cleanse).
 *   5. Apply recoil if any.
 *   6. Decrement caster's expired buffs.
 *   7. Persist tactical state; process enemy defeats and spawn next enemy if needed.
 */
export async function executeMove(args: {
  participationId: string
  casterId: string
  moveId: string
  targetIds: string[]
  casterMana: number
  repos: CombatRewardDeps
}): Promise<TacticalMoveResult> {
  const { participationId, casterId, moveId, targetIds, casterMana, repos } = args

  const participation = await repos.characterQuestRepository.findByIdWithTacticalState(participationId)
  if (!participation) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Participation not found' })
  }
  if (!participation.tacticalState?.units?.length) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'No tactical combat in progress' })
  }

  let state = participation.tacticalState
  const casterIdx = findUnitIndex(state, casterId)
  if (casterIdx < 0) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Caster not found' })
  }
  if (state.turnOrder[state.currentTurnIndex] !== casterId) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: "Not this unit's turn" })
  }

  const move = ABILITIES[moveId]
  if (!move) {
    throw new TRPCError({ code: 'NOT_FOUND', message: `Move ${moveId} not found` })
  }
  if (casterMana < move.manaCost) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Not enough mana' })
  }

  // STUNNED / IMMOBILIZED caster skips their action but still consumes turn order.
  const caster = state.units[casterIdx]
  const stunned = (caster.activeEffects ?? []).some((e) => e.effect === StatusEffect.STUNNED && e.remainingTurns > 0)

  const timestamp = Date.now()
  const logEntries: CombatLogEntry[] = []
  const effects: MoveEffectResult[] = []
  let recoilDamage = 0
  let casterKilled = false

  // Get player tier for level lookup (player units only; enemies carry .tier on TacticalUnitState).
  const isCasterPlayer = casterId.startsWith('player-')
  let playerTier = 1
  if (participation.characterId) {
    const character = await repos.characterRepository.findByIdWithClasses(participation.characterId)
    if (character) playerTier = findCurrentClass(character).tier
  }
  const casterTier = getUnitTier(caster, playerTier)

  const damageMove = isDamageMove(move)
  const isAoE = move.targeting === 'all'

  logEntries.push({
    timestamp,
    type: CombatLogType.PLAYER_ATTACK,
    data: { moveId, caster: caster.name, targetCount: targetIds.length, ability: moveId }
  })

  if (!stunned && damageMove) {
    const livingTargets = targetIds.filter((id) => {
      const u = state.units.find((s) => s.id === id)
      return !!u && u.currentHealth > 0
    })

    for (const tid of livingTargets) {
      const tIdx = findUnitIndex(state, tid)
      if (tIdx < 0) continue
      const target = state.units[tIdx]
      const targetTier = getUnitTier(target, playerTier)

      const result = resolveDamageMove({
        caster: state.units[casterIdx],
        target,
        move,
        casterTier,
        targetTier
      })

      let dmg = result.damage
      if (isAoE) dmg = Math.floor(dmg * 0.6)

      const newHealth = Math.max(0, target.currentHealth - dmg)
      const killed = newHealth <= 0

      let units = withUpdated(state, tIdx, { currentHealth: newHealth })

      // Apply move side-effects on hit (status, debuff). Per spec, statuses apply only on damaging hits.
      if (dmg > 0 && !result.protected) {
        for (const e of move.effects) {
          if (e.target === AbilityTarget.ENEMY) {
            if (e.type === AbilityEffectType.APPLY_STATUS && e.statusEffect) {
              const existingEffects = units[tIdx].activeEffects ?? []
              units = units.map((u, i) =>
                i === tIdx
                  ? {
                      ...u,
                      activeEffects: [
                        ...existingEffects,
                        {
                          effect: e.statusEffect!,
                          remainingTurns: e.duration ?? 1,
                          sourceAbilityId: moveId
                        } as ActiveStatusEffect
                      ]
                    }
                  : u
              )
              effects.push({ unitId: tid, statusApplied: e.statusEffect })
            } else if (e.type === AbilityEffectType.POWER_MODIFIER) {
              const existing = units[tIdx].activeAbilities ?? {}
              units = units.map((u, i) =>
                i === tIdx
                  ? {
                      ...u,
                      activeAbilities: {
                        ...existing,
                        [moveId]: {
                          effect: StatusEffect.ABILITY_ACTIVE,
                          remainingTurns: e.duration ?? 1,
                          sourceAbilityId: moveId
                        }
                      }
                    }
                  : u
              )
            }
          }
        }
      }

      // Apply thorns reflect to caster
      if (dmg > 0 && result.thornsDamage > 0) {
        const ci = findUnitIndex({ ...state, units }, casterId)
        if (ci >= 0) {
          const newCasterHp = Math.max(0, units[ci].currentHealth - result.thornsDamage)
          units = units.map((u, i) => (i === ci ? { ...u, currentHealth: newCasterHp } : u))
          recoilDamage += result.thornsDamage
          logEntries.push({
            timestamp: timestamp + 0.5,
            type: CombatLogType.DAMAGE_TO_PLAYER,
            data: { damage: result.thornsDamage, source: 'thorns' }
          })
          if (newCasterHp <= 0) casterKilled = true
        }
      }

      state = { ...state, units }

      logEntries.push({
        timestamp: timestamp + 1,
        type: CombatLogType.DAMAGE_TO_ENEMY,
        data: { enemy: target.name, damage: dmg, isCritical: result.isCrit, ability: moveId }
      })
      if (killed) {
        logEntries.push({
          timestamp: timestamp + 2,
          type: CombatLogType.ENEMY_DEFEATED,
          data: { enemy: target.name }
        })
      }
      effects.push({ unitId: tid, damageDealt: dmg, killed, isCritical: result.isCrit })
    }

    // Apply move-level recoil (reckless_strike: 25% of total damage dealt)
    if (move.recoilPercent && move.recoilPercent > 0 && !stunned) {
      const totalDamage = effects.reduce((s, e) => s + (e.damageDealt ?? 0), 0)
      const recoil = Math.floor((totalDamage * move.recoilPercent) / 100)
      if (recoil > 0) {
        const ci = findUnitIndex(state, casterId)
        const newHp = Math.max(0, state.units[ci].currentHealth - recoil)
        state = { ...state, units: withUpdated(state, ci, { currentHealth: newHp }) }
        recoilDamage += recoil
        if (newHp <= 0) casterKilled = true
        logEntries.push({
          timestamp: timestamp + 3,
          type: CombatLogType.DAMAGE_TO_PLAYER,
          data: { damage: recoil, source: 'recoil', ability: moveId }
        })
      }
    }
  }

  // Side-effect-only moves (or side-effect riders not tied to damage)
  if (!stunned) {
    for (const e of move.effects) {
      if (e.target === AbilityTarget.SELF) {
        if (
          e.type === AbilityEffectType.POWER_MODIFIER ||
          e.type === AbilityEffectType.THRESHOLD_MODIFIER ||
          e.type === AbilityEffectType.GUARANTEED_CRITICAL ||
          e.type === AbilityEffectType.NEGATE_HITS
        ) {
          state = applySelfBuffActiveAbility(state, casterId, moveId, e.duration ?? 1)
        } else if (e.type === AbilityEffectType.HEAL && (e.value ?? 0) === 0) {
          // Cleanse
          state = cleanseDebuffs(state, casterId)
        } else if (e.type === AbilityEffectType.HEAL && (e.value ?? 0) > 0) {
          // Direct heal (legacy path, not used in beta)
          const ci = findUnitIndex(state, casterId)
          if (ci >= 0) {
            const u = state.units[ci]
            const newHp = Math.min(u.maxHealth, u.currentHealth + (e.value ?? 0))
            state = { ...state, units: withUpdated(state, ci, { currentHealth: newHp }) }
            effects.push({ unitId: casterId, healthRestored: newHp - u.currentHealth })
          }
        }
      } else if (e.target === AbilityTarget.ENEMY && !damageMove) {
        // Pure status / debuff applied without a damage roll (no such moves in beta — defensive).
        for (const tid of targetIds) {
          if (e.type === AbilityEffectType.APPLY_STATUS && e.statusEffect) {
            state = applyAppliedStatusToTarget(state, tid, e.statusEffect, e.duration ?? 1, moveId)
            effects.push({ unitId: tid, statusApplied: e.statusEffect })
          } else if (e.type === AbilityEffectType.POWER_MODIFIER) {
            state = applyDebuffActiveAbilityToTarget(state, tid, moveId, e.duration ?? 1)
          }
        }
      }
    }
  }

  // Decrement caster's buffs (single-turn buffs expire after action).
  {
    const ci = findUnitIndex(state, casterId)
    if (ci >= 0) {
      const decremented = dropExpiredBuffs(state.units[ci])
      state = {
        ...state,
        units: withUpdated(state, ci, {
          activeAbilities: decremented.activeAbilities
        })
      }
    }
  }

  // Filter out dead enemies; keep dead players for death dialog.
  const aliveUnits = state.units.filter((u) => u.id.startsWith('player-') || u.currentHealth > 0)
  const aliveTurnOrder = state.turnOrder.filter((id) => aliveUnits.find((u) => u.id === id && u.currentHealth > 0))
  // Advance pointer to the next living unit (Pokémon-style round robin) so the
  // next call to executeMove — typically the enemy AI turn — passes the turn check.
  let nextTurnIndex = 0
  if (aliveTurnOrder.length > 0) {
    const casterPos = aliveTurnOrder.indexOf(casterId)
    nextTurnIndex =
      casterPos < 0
        ? state.currentTurnIndex % aliveTurnOrder.length
        : (casterPos + 1) % aliveTurnOrder.length
  }
  state = { ...state, units: aliveUnits, turnOrder: aliveTurnOrder, currentTurnIndex: nextTurnIndex }

  // Reset the once-per-turn potion gate at the end of the enemy's turn — that's the
  // moment the player's next turn begins. Without this, the flag persists in DB and
  // blocks the player from using a potion ever again until a new encounter spawns.
  if (!isCasterPlayer && state.potionUsedThisTurn) {
    state = { ...state, potionUsedThisTurn: false }
  }

  await repos.characterQuestRepository.updateTacticalState(participationId, state)

  // Sync player class HP/mana to DB after any move that touched the player.
  // - Player-cast move: deduct mana cost (unless stunned), HP reflects recoil/thorns.
  // - Enemy-cast move: HP reflects incoming damage; mana untouched.
  if (participation.characterId) {
    const character = await repos.characterRepository.findByIdWithClasses(participation.characterId)
    if (character) {
      const cls = findCurrentClass(character)
      const playerUnit = state.units.find((u) => u.id.startsWith('player-'))
      const newHp = playerUnit?.currentHealth ?? cls.health
      const newMana = isCasterPlayer
        ? Math.max(0, casterMana - (stunned ? 0 : move.manaCost))
        : cls.mana
      await repos.characterRepository.updateHealth(cls.id, newHp, newMana)
    }
  }

  // Defeat handling / spawn next enemy.
  let goldReward = 0
  let nextEnemy: TacticalMoveResult['nextEnemy']
  let tierProgression: { oldTier: number; newTier: number } | undefined

  const killedIds = effects.filter((e) => e.killed && !e.unitId.startsWith('player-')).map((e) => e.unitId)
  if (killedIds.length > 0 && repos.combatEnemyRepository) {
    const activeEnemy = await repos.combatEnemyRepository.getActiveEnemy(participationId)
    if (activeEnemy) {
      await repos.combatEnemyRepository.updateEnemy(activeEnemy.id, {
        currentHealth: 0,
        damageDealt: effects.reduce((s, e) => s + (e.damageDealt ?? 0), 0),
        criticalHits: effects.filter((e) => e.isCritical).length
      })
      await repos.combatEnemyRepository.appendToCombatLog(activeEnemy.id, logEntries)
    }
    const defeat = await processEnemyDefeat(participationId, state, killedIds, repos)
    goldReward = defeat.goldReward
    nextEnemy = defeat.nextEnemy
    tierProgression = defeat.tierProgression
  } else if (repos.combatEnemyRepository) {
    // Just log if no defeat
    const activeEnemy = await repos.combatEnemyRepository.getActiveEnemy(participationId)
    if (activeEnemy) {
      await repos.combatEnemyRepository.appendToCombatLog(activeEnemy.id, logEntries)
      const totalDmg = effects.reduce((s, e) => s + (e.damageDealt ?? 0), 0)
      if (totalDmg > 0) {
        await repos.combatEnemyRepository.updateEnemy(activeEnemy.id, {
          damageDealt: totalDmg,
          criticalHits: effects.filter((e) => e.isCritical).length
        })
      }
    }
  }

  const base = {
    casterId,
    moveId,
    targeting: (move.targeting ?? 'single') as 'single' | 'all',
    affectedUnitIds: targetIds,
    effects,
    manaCost: move.manaCost,
    updatedState: state,
    logEntries,
    recoilDamage: recoilDamage > 0 ? recoilDamage : undefined,
    casterKilled: casterKilled || undefined,
    goldReward: goldReward > 0 ? goldReward : undefined,
    nextEnemy,
    tierProgression
  }
  return { ...base, success: true as const, newMana: Math.max(0, casterMana - (stunned ? 0 : move.manaCost)) }
}

/**
 * Enemy turn: pick the cheapest viable move (or basic_strike) and execute against the player.
 * Returns the same shape as executeMove but with `casterId` = enemy unit id.
 */
export async function executeEnemyMove(args: {
  participationId: string
  enemyId: string
  repos: CombatRewardDeps
}): Promise<TacticalMoveResult> {
  const { participationId, enemyId, repos } = args
  const participation = await repos.characterQuestRepository.findByIdWithTacticalState(participationId)
  if (!participation) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Participation not found' })
  }
  let state = participation.tacticalState
  if (!state?.units) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'No tactical combat in progress' })
  }
  const enemy = state.units.find((u) => u.id === enemyId)
  if (!enemy) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Enemy not found' })
  }
  const player = state.units.find((u) => u.id.startsWith('player-'))
  if (!player) {
    // No player — return a no-op result.
    return {
      success: true as const,
      casterId: enemyId,
      moveId: 'basic_strike',
      targeting: 'single',
      affectedUnitIds: [],
      effects: [],
      manaCost: 0,
      updatedState: state,
      logEntries: [],
      newMana: enemy.currentMana
    }
  }

  // Process start-of-turn status effects (DOT, expirations).
  const enemyIdx = state.units.findIndex((u) => u.id === enemyId)
  if (enemyIdx >= 0) {
    const e = state.units[enemyIdx]
    let dotDamage = 0
    const isDemon = e.templateId?.includes('demon') ?? false
    for (const eff of e.activeEffects ?? []) {
      if (eff.remainingTurns <= 0) continue
      if (eff.effect === StatusEffect.BURNING && !isDemon) dotDamage += 5
      else if (eff.effect === StatusEffect.PURIFIED) dotDamage += 5
      else if (eff.effect === StatusEffect.POISONED) dotDamage += 10
    }
    const decremented = decrementStatusEffects(e)
    const newHp = Math.max(0, e.currentHealth - dotDamage)
    state = {
      ...state,
      units: state.units.map((u, i) =>
        i === enemyIdx
          ? { ...u, currentHealth: newHp, activeEffects: decremented.activeEffects }
          : u
      )
    }
    if (newHp <= 0) {
      // DOT kill: filter the dead enemy out of units/turnOrder so the next player
      // attack passes the turn check, persist, then run defeat handling so the
      // next enemy spawns and gold/tier rewards fire (same as a player kill).
      const aliveUnits = state.units.filter((u) => u.id.startsWith('player-') || u.currentHealth > 0)
      const aliveTurnOrder = state.turnOrder.filter((id) =>
        aliveUnits.find((u) => u.id === id && u.currentHealth > 0)
      )
      const playerIdx = aliveTurnOrder.findIndex((id) => id.startsWith('player-'))
      state = {
        ...state,
        units: aliveUnits,
        turnOrder: aliveTurnOrder,
        currentTurnIndex: playerIdx >= 0 ? playerIdx : 0,
        ...(state.potionUsedThisTurn ? { potionUsedThisTurn: false } : {})
      }
      await repos.characterQuestRepository.updateTacticalState(participationId, state)

      const dotLogEntries: CombatLogEntry[] = [
        {
          timestamp: Date.now(),
          type: CombatLogType.ENEMY_DEFEATED,
          data: { enemy: e.name, source: 'status_effect' }
        }
      ]

      let goldReward = 0
      let nextEnemy: TacticalMoveResult['nextEnemy']
      let tierProgression: { oldTier: number; newTier: number } | undefined

      if (repos.combatEnemyRepository) {
        const activeEnemy = await repos.combatEnemyRepository.getActiveEnemy(participationId)
        if (activeEnemy) {
          await repos.combatEnemyRepository.appendToCombatLog(activeEnemy.id, dotLogEntries)
        }
        const defeat = await processEnemyDefeat(participationId, state, [enemyId], repos)
        goldReward = defeat.goldReward
        nextEnemy = defeat.nextEnemy
        tierProgression = defeat.tierProgression
      }

      return {
        success: true as const,
        casterId: enemyId,
        moveId: 'basic_strike',
        targeting: 'single',
        affectedUnitIds: [],
        effects: [{ unitId: enemyId, damageDealt: dotDamage, killed: true }],
        manaCost: 0,
        updatedState: state,
        logEntries: dotLogEntries,
        newMana: e.currentMana,
        goldReward: goldReward > 0 ? goldReward : undefined,
        nextEnemy,
        tierProgression
      }
    }
  }

  // Immobilized / stunned: pass turn.
  const stillStunned = (state.units.find((u) => u.id === enemyId)?.activeEffects ?? []).some(
    (eff) =>
      (eff.effect === StatusEffect.STUNNED || eff.effect === StatusEffect.IMMOBILIZED) && eff.remainingTurns > 0
  )
  if (stillStunned) {
    return {
      success: true as const,
      casterId: enemyId,
      moveId: 'basic_strike',
      targeting: 'single',
      affectedUnitIds: [],
      effects: [],
      manaCost: 0,
      updatedState: state,
      logEntries: [],
      newMana: state.units.find((u) => u.id === enemyId)?.currentMana ?? 0
    }
  }

  // Move selection: pick cheapest affordable move from enemy.moves[]; fall back to basic_strike.
  const currentEnemy = state.units.find((u) => u.id === enemyId)!
  const pool = ((currentEnemy.moves && currentEnemy.moves.length > 0 ? currentEnemy.moves : ['basic_strike']) ?? [])
    .map((id) => ABILITIES[id])
    .filter((d): d is NonNullable<typeof d> => !!d && d.manaCost <= currentEnemy.currentMana)
  const chosen = pool[0] ?? ABILITIES['basic_strike']
  if (!chosen) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'basic_strike not in ABILITIES' })
  }

  return executeMove({
    participationId,
    casterId: enemyId,
    moveId: chosen.id,
    targetIds: [player.id],
    casterMana: currentEnemy.currentMana,
    repos
  })
}
