import { DOCTRINES } from '@shared/constants/doctrines'
import { getConsumableById } from '@shared/constants/items'
import type { CharacterClassType, CharacterWithClasses } from '@shared/types/character.types'
import { DoctrineEffectType, StatusEffect, type ActiveStatusEffect } from '@shared/types/doctrine.types'
import type { CombatLogEntry, DiceRollResult, InventoryItem } from '@shared/types/gamification.types'
import { ItemType } from '@shared/types/gamification.types'
import {
  type AttackValidationResult,
  type EnemyTurnResult,
  type SelfBuffDoctrineResultWithMana,
  type TacticalAttackResult,
  type TacticalDoctrineResult,
  type TacticalDoctrineResultWithMana,
  type TacticalStateData
} from '@shared/types/tactical-combat.types'
import { TRPCError } from '@trpc/server'
import type { CharacterQuestRepository } from '../repositories/character-quest.repository'
import type { CharacterRepository } from '../repositories/character.repository'
import type { CombatEnemyRepository } from '../repositories/combat-enemy.repository'
import type { CharacterService } from './character.service'
import type { DiceService } from './dice.service'
import type { KillRecordService } from './kill-record.service'

import * as attackResolution from '../utils/combat/attack-resolution'
import * as dice from '../utils/combat/dice'
import * as doctrineBuffs from '../utils/combat/doctrine-buffs'
import * as enemyAI from '../utils/combat/enemy-ai'
import { type CombatRewardDeps } from '../utils/combat/rewards'
import * as tacticalDoctrine from '../utils/combat/tactical-doctrine'

export class CombatService {
  constructor(
    private characterRepository: CharacterRepository,
    private characterQuestRepository: CharacterQuestRepository,
    private characterService: CharacterService,
    private diceService: DiceService,
    private combatEnemyRepository?: CombatEnemyRepository,
    private killRecordService?: KillRecordService
  ) {}

  private async assertQuestOwnership(questId: string, userId: string, message: string): Promise<void> {
    const isOwner = await this.characterQuestRepository.verifyOwnership(questId, userId)
    if (!isOwner) {
      throw new TRPCError({ code: 'FORBIDDEN', message })
    }
  }

  private async getCurrentClassForUser(userId: string) {
    const character = await this.characterService.getCurrentClass(userId)
    if (!character) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Character not found' })
    }
    const currentClass = character.classes.find((c) => c.className === character.currentClass)
    if (!currentClass) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Character class not found' })
    }
    return currentClass
  }

  private get repos(): CombatRewardDeps {
    return {
      characterRepository: this.characterRepository,
      characterQuestRepository: this.characterQuestRepository,
      combatEnemyRepository: this.combatEnemyRepository,
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
    consumableId: string,
    opts?: { markPotionTurn?: boolean }
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

    // Check if there's an active quest with a tactical combat state
    const activeQuest = await this.characterQuestRepository.findActiveByCharacterId(character.id)
    const participation: { id: string; tacticalState: TacticalStateData | null } | null = activeQuest
      ? { id: activeQuest.id, tacticalState: activeQuest.tacticalState }
      : null

    // Per-turn potion guard for combat use. Throw before mutating inventory or stats.
    if (opts?.markPotionTurn && participation?.tacticalState?.potionUsedThisTurn) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Already used a potion this turn' })
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

    // Single merged write: combine any unit-health update with the optional potion-turn marker.
    if (participation?.id && participation.tacticalState) {
      const baseState = participation.tacticalState
      const shouldUpdateUnits = !!playerUnit && healthRestored > 0
      const shouldMarkPotion = !!opts?.markPotionTurn

      if (shouldUpdateUnits || shouldMarkPotion) {
        const units = shouldUpdateUnits
          ? baseState.units.map((u) =>
              u.id.startsWith('player-')
                ? { ...u, currentHealth: Math.min(u.currentHealth + healthRestored, u.maxHealth) }
                : u
            )
          : baseState.units

        await this.characterQuestRepository.updateTacticalState(participation.id, {
          ...baseState,
          units,
          ...(shouldMarkPotion ? { potionUsedThisTurn: true } : {})
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
    questId: string
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

    // Update quest state
    const quest = await this.characterQuestRepository.findByIdWithDoctrines(questId)

    if (!quest) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Quest not found' })
    }

    const activeDoctrines = quest.activeDoctrines || {}

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
        effect: StatusEffect.DOCTRINE_ACTIVE,
        remainingTurns: 1,
        sourceDoctrineId: doctrineId
      }
    }

    activeDoctrines[doctrineId] = newStatusEffect

    await this.characterQuestRepository.updateActiveDoctrines(questId, activeDoctrines)

    return { success: true, effect: newStatusEffect }
  }

  // ============================================================
  // TACTICAL COMBAT METHODS
  // ============================================================

  validateTacticalAttack(state: TacticalStateData, attackerId: string, targetId: string): AttackValidationResult {
    return attackResolution.validateTacticalAttack(state, attackerId, targetId)
  }

  async executeTacticalAttack(
    questId: string,
    attackerId: string,
    targetId: string,
    attackerRolls: number[],
    defenderRolls: number[],
    attackThreshold: number,
    defenseThreshold: number,
    attackCriticalThreshold: number = 6
  ): Promise<TacticalAttackResult> {
    return attackResolution.executeTacticalAttack(
      questId,
      attackerId,
      targetId,
      attackerRolls,
      defenderRolls,
      attackThreshold,
      defenseThreshold,
      attackCriticalThreshold,
      this.repos
    )
  }

  // ============================================================
  // ENEMY AI METHODS
  // ============================================================

  async executeEnemyTurn(
    questId: string,
    enemyId: string,
    enemyAttackDice: number,
    enemyAttackThreshold: number
  ): Promise<EnemyTurnResult> {
    return enemyAI.executeEnemyTurn(questId, enemyId, enemyAttackDice, enemyAttackThreshold, this.repos)
  }

  // ============================================================
  // TACTICAL DOCTRINE METHODS
  // ============================================================

  async executeTacticalDoctrine(
    questId: string,
    casterId: string,
    doctrineId: string,
    targeting: 'single' | 'all',
    targetIds: string[],
    casterMana: number
  ): Promise<TacticalDoctrineResult> {
    return tacticalDoctrine.executeTacticalDoctrine(
      questId,
      casterId,
      doctrineId,
      targeting,
      targetIds,
      casterMana,
      this.repos
    )
  }

  async useSelfBuffDoctrine(
    questId: string,
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
    return tacticalDoctrine.useSelfBuffDoctrine(questId, casterId, doctrineId, casterMana, this.repos)
  }

  getActiveDoctrineBuffs(unitActiveDoctrines: Record<string, ActiveStatusEffect> | undefined, incomingHits?: number) {
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

  // ============================================================
  // PLAYER-FACING ENTRY POINTS (handle ownership, dice, mana, state)
  // ============================================================

  async playerAttack(
    userId: string,
    questId: string,
    attackerId: string,
    targetId: string,
    attackRolls: number[],
    defenseRolls: number[],
    attackThreshold: number,
    defenseThreshold: number,
    attackCriticalThreshold: number = 6
  ): Promise<TacticalAttackResult> {
    await this.assertQuestOwnership(questId, userId, 'Not authorized to control this combat')

    if (!attackerId.startsWith('player-')) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot attack with enemy units' })
    }

    const totalDiceUsed = attackRolls.length + defenseRolls.length
    await this.diceService.consumeDiceFromBank(userId, totalDiceUsed)

    return this.executeTacticalAttack(
      questId,
      attackerId,
      targetId,
      attackRolls,
      defenseRolls,
      attackThreshold,
      defenseThreshold,
      attackCriticalThreshold
    )
  }

  async playerEnemyTurn(
    userId: string,
    questId: string,
    enemyId: string,
    enemyAttackDice: number,
    enemyAttackThreshold: number
  ): Promise<EnemyTurnResult> {
    await this.assertQuestOwnership(questId, userId, 'Not authorized to control this combat')

    if (enemyId.startsWith('player-')) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot execute AI turn for player units' })
    }

    return this.executeEnemyTurn(questId, enemyId, enemyAttackDice, enemyAttackThreshold)
  }

  async playerCastDoctrine(
    userId: string,
    questId: string,
    casterId: string,
    doctrineId: string,
    targeting: 'single' | 'all',
    targetIds: string[]
  ): Promise<TacticalDoctrineResultWithMana> {
    await this.assertQuestOwnership(questId, userId, 'Not authorized to control this combat')

    if (!casterId.startsWith('player-')) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot cast doctrine with enemy units' })
    }

    const currentClass = await this.getCurrentClassForUser(userId)

    const result = await this.executeTacticalDoctrine(
      questId,
      casterId,
      doctrineId,
      targeting,
      targetIds,
      currentClass.mana
    )

    if (result.success) {
      const newMana = currentClass.mana - result.manaCost
      await this.characterService.updateHealth(currentClass.id, currentClass.health, newMana)
      return { ...result, success: true as const, newMana }
    }

    return { ...result, success: false as const }
  }

  async playerCastSelfBuffDoctrine(
    userId: string,
    questId: string,
    casterId: string,
    doctrineId: string
  ): Promise<SelfBuffDoctrineResultWithMana> {
    await this.assertQuestOwnership(questId, userId, 'Not authorized to control this combat')

    if (!casterId.startsWith('player-')) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot cast doctrine with enemy units' })
    }

    const currentClass = await this.getCurrentClassForUser(userId)

    const result = await this.useSelfBuffDoctrine(questId, casterId, doctrineId, currentClass.mana)

    if (result.success) {
      const newMana = currentClass.mana - result.manaCost
      await this.characterService.updateHealth(currentClass.id, currentClass.health, newMana)
      return { ...result, success: true as const, newMana }
    }

    return { ...result, success: false as const }
  }

  async playerUsePotion(
    userId: string,
    questId: string,
    consumableId: string
  ): Promise<{ success: boolean; healthRestored?: number; manaRestored?: number }> {
    await this.assertQuestOwnership(questId, userId, 'Not authorized to control this combat')
    return this.useConsumable(userId, consumableId, { markPotionTurn: true })
  }
}
