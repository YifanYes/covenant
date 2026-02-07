import { DOCTRINES } from '@shared/constants/doctrines'
import { getConsumableById } from '@shared/constants/items'
import type { CharacterClassType, CharacterWithClasses } from '@shared/types/character.types'
import { DoctrineEffectType, StatusEffect, type ActiveStatusEffect } from '@shared/types/doctrine.types'
import type {
  CombatLogEntry,
  DiceRollResult,
  InventoryItem
} from '@shared/types/gamification.types'
import { ItemType } from '@shared/types/gamification.types'
import {
  type GridPosition,
  type TacticalStateData,
  type MovementValidationResult,
  type MovementExecutionResult,
  type AttackValidationResult,
  type TacticalAttackResult,
  type EnemyTurnResult,
  type TacticalDoctrineResult
} from '@shared/types/tactical-combat.types'
import { TRPCError } from '@trpc/server'
import type { ActivityParticipationRepository } from '../repositories/activity-participation.repository'
import type { ActivityRepository } from '../repositories/activity.repository'
import type { CharacterRepository } from '../repositories/character.repository'
import type { CombatEnemyRepository } from '../repositories/combat-enemy.repository'
import type { KillRecordService } from './kill-record.service'

import * as dice from '../utils/combat/dice'
import * as doctrineBuffs from '../utils/combat/doctrine-buffs'
import * as movement from '../utils/combat/movement'
import * as attackResolution from '../utils/combat/attack-resolution'
import * as enemyAI from '../utils/combat/enemy-ai'
import * as tacticalDoctrine from '../utils/combat/tactical-doctrine'
import { type CombatRewardDeps } from '../utils/combat/rewards'

export class CombatService {
  constructor(
    private characterRepository: CharacterRepository,
    private activityParticipationRepository: ActivityParticipationRepository,
    private combatEnemyRepository?: CombatEnemyRepository,
    private activityRepository?: ActivityRepository,
    private killRecordService?: KillRecordService
  ) {}

  private get repos(): CombatRewardDeps {
    return {
      characterRepository: this.characterRepository,
      activityParticipationRepository: this.activityParticipationRepository,
      combatEnemyRepository: this.combatEnemyRepository,
      activityRepository: this.activityRepository,
      killRecordService: this.killRecordService
    }
  }

  rollDice(count: number): number[] {
    return dice.rollDice(count)
  }

  calculateHitsWithCount(
    rolls: number[],
    threshold: number,
    criticalThreshold: number = 6,
    guaranteedCritical: boolean = false
  ): { results: DiceRollResult[]; count: number } {
    return dice.calculateHitsWithCount(rolls, threshold, criticalThreshold, guaranteedCritical)
  }

  getCurrentClassOrThrow(character: CharacterWithClasses): CharacterClassType {
    return dice.getCurrentClassOrThrow(character)
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

    const currentClass = dice.getCurrentClassOrThrow(character)

    // Check if there's an active tactical combat - use tactical state health if so
    // Get the active activity ID from character data
    const activeActivityId = (character.data as any)?.activeActivityId
    let participation: { id: string; tacticalState: TacticalStateData | null } | null = null

    if (activeActivityId) {
      // Find participation for the active activity
      participation = await this.activityParticipationRepository.findByCharacterAndActivity(
        character.id,
        activeActivityId
      )
    }

    const playerUnit = participation?.tacticalState?.units?.find((u) => u.id.startsWith('player-'))

    // Use tactical combat health if in tactical combat, otherwise use database health
    const currentHealth = playerUnit?.currentHealth ?? currentClass.health
    const maxHealth = playerUnit?.maxHealth ?? currentClass.maxHealth

    let healthRestored = 0
    let manaRestored = 0

    if (consumable.effect.healHealth) {
      healthRestored = Math.min(consumable.effect.healHealth, maxHealth - currentHealth)
    }
    if (consumable.effect.healMana) {
      manaRestored = Math.min(consumable.effect.healMana, currentClass.maxMana - currentClass.mana)
    }

    // Update database health to match tactical state (capped at maxHealth)
    const newDbHealth = Math.min(currentHealth + healthRestored, maxHealth)
    const newMana = currentClass.mana + manaRestored
    await this.characterRepository.updateHealth(currentClass.id, newDbHealth, newMana)

    // Remove consumable from inventory
    const newInventory = [...inventory]
    newInventory.splice(itemIndex, 1)
    await this.characterRepository.updateInventoryAndLoadout(
      character.id,
      newInventory,
      character.loadout as unknown as InventoryItem[]
    )

    // Update tactical combat state if there's an active tactical combat
    if (participation?.tacticalState?.units && playerUnit && healthRestored > 0) {
      const units = [...participation.tacticalState.units]
      const playerUnitIndex = units.findIndex((u) => u.id.startsWith('player-'))

      if (playerUnitIndex !== -1) {
        units[playerUnitIndex] = {
          ...units[playerUnitIndex],
          currentHealth: Math.min(playerUnit.currentHealth + healthRestored, playerUnit.maxHealth)
        }

        await this.activityParticipationRepository.updateTacticalState(participation.id, {
          ...participation.tacticalState,
          units
        })
      }
    }

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

  validateTacticalMove(
    state: TacticalStateData,
    unitId: string,
    path: GridPosition[]
  ): MovementValidationResult {
    return movement.validateTacticalMove(state, unitId, path)
  }

  async executeTacticalMove(
    participationId: string,
    unitId: string,
    path: GridPosition[],
    movementRange: number
  ): Promise<MovementExecutionResult> {
    return movement.executeTacticalMove(participationId, unitId, path, movementRange, this.activityParticipationRepository)
  }

  validateTacticalAttack(
    state: TacticalStateData,
    attackerId: string,
    targetId: string,
    attackRange: number
  ): AttackValidationResult {
    return attackResolution.validateTacticalAttack(state, attackerId, targetId, attackRange)
  }

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
    return attackResolution.executeTacticalAttack(
      participationId, attackerId, targetId, attackerRolls, defenderRolls,
      attackRange, attackThreshold, defenseThreshold, attackCriticalThreshold, this.repos
    )
  }

  // ============================================================
  // ENEMY AI METHODS
  // ============================================================

  async executeEnemyTurn(
    participationId: string,
    enemyId: string,
    enemyMovementRange: number,
    enemyAttackRange: number,
    enemyAttackDice: number,
    enemyAttackThreshold: number
  ): Promise<EnemyTurnResult> {
    return enemyAI.executeEnemyTurn(
      participationId, enemyId, enemyMovementRange, enemyAttackRange,
      enemyAttackDice, enemyAttackThreshold, this.repos
    )
  }

  // ============================================================
  // TACTICAL DOCTRINE METHODS
  // ============================================================

  calculateAoETargets(
    targetPosition: GridPosition,
    casterPosition: GridPosition,
    doctrineId: string,
    state: TacticalStateData
  ): { tiles: GridPosition[]; unitIds: string[] } {
    return doctrineBuffs.calculateAoETargets(targetPosition, casterPosition, doctrineId, state)
  }

  validateTacticalDoctrine(
    state: TacticalStateData,
    casterId: string,
    doctrineId: string,
    targetPosition: GridPosition,
    casterMana: number
  ): { valid: boolean; reason?: string } {
    return doctrineBuffs.validateTacticalDoctrine(state, casterId, doctrineId, targetPosition, casterMana)
  }

  async executeTacticalDoctrine(
    participationId: string,
    casterId: string,
    doctrineId: string,
    targetPosition: GridPosition,
    casterMana: number
  ): Promise<TacticalDoctrineResult> {
    return tacticalDoctrine.executeTacticalDoctrine(participationId, casterId, doctrineId, targetPosition, casterMana, this.repos)
  }

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
    updatedState: TacticalStateData
  }> {
    return tacticalDoctrine.useSelfBuffDoctrine(participationId, casterId, doctrineId, casterMana, this.repos)
  }

  getActiveDoctrineBuffs(
    unitActiveDoctrines: Record<string, ActiveStatusEffect> | undefined,
    incomingHits?: number
  ) {
    return doctrineBuffs.getActiveDoctrineBuffs(unitActiveDoctrines, incomingHits)
  }

  clearConsumedDoctrines(
    unitActiveDoctrines: Record<string, ActiveStatusEffect> | undefined,
    clearDefenseBuffs: boolean = false
  ): Record<string, ActiveStatusEffect> {
    return doctrineBuffs.clearConsumedDoctrines(unitActiveDoctrines, clearDefenseBuffs)
  }

  clearConsumedDefenseDoctrines(
    unitActiveDoctrines: Record<string, ActiveStatusEffect> | undefined
  ): Record<string, ActiveStatusEffect> {
    return doctrineBuffs.clearConsumedDefenseDoctrines(unitActiveDoctrines)
  }
}
