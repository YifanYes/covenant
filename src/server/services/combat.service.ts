import type { PrismaClient } from '@/generated/prisma'
import { getConsumableById } from '@shared/constants/items'
import type { CharacterClassType, CharacterWithClasses } from '@shared/types/character.types'
import { ItemType, type InventoryItem } from '@shared/types/gamification.types'
import type {
  TacticalMoveResult,
  TacticalStateData
} from '@shared/types/tactical-combat.types'
import { TRPCError } from '@trpc/server'

import { RESOURCE_NOT_FOUND_OR_FORBIDDEN } from '../lib/errors'
import type { CharacterQuestRepository } from '../repositories/character-quest.repository'
import type { CharacterRepository } from '../repositories/character.repository'
import type { CombatEnemyRepository } from '../repositories/combat-enemy.repository'
import { executeEnemyMove, executeMove } from '../utils/combat/move-resolution'
import { type CombatRewardDeps } from '../utils/combat/rewards'
import type { CharacterService } from './character.service'
import type { KillRecordService } from './kill-record.service'
import type { ManaService } from './mana.service'

// Combine an auto-run enemy turn (when recovery fired) with the player's move so
// the FE receives both halves of the round: enemy logs/effects render first, then
// the player's. updatedState is taken from the player result (chronologically
// last). Reward / nextEnemy / tierProgression collapse to whichever side produced
// them — in practice only one side can, since the encounter ends after the kill.
function mergeMoveResults(
  enemy: TacticalMoveResult,
  player: TacticalMoveResult
): TacticalMoveResult {
  const base = {
    ...player,
    affectedUnitIds: [...enemy.affectedUnitIds, ...player.affectedUnitIds],
    effects: [...enemy.effects, ...player.effects],
    logEntries: [...enemy.logEntries, ...player.logEntries],
    goldReward: player.goldReward ?? enemy.goldReward,
    nextEnemy: player.nextEnemy ?? enemy.nextEnemy,
    tierProgression: player.tierProgression ?? enemy.tierProgression
  }
  return base
}

export class CombatService {
  constructor(
    private characterRepository: CharacterRepository,
    private characterQuestRepository: CharacterQuestRepository,
    private characterService: CharacterService,
    private combatEnemyRepository?: CombatEnemyRepository,
    private killRecordService?: KillRecordService,
    private manaService?: ManaService,
    private prisma?: PrismaClient
  ) {}

  private async assertQuestOwnership(questId: string, userId: string): Promise<void> {
    const isOwner = await this.characterQuestRepository.verifyOwnership(questId, userId)
    if (!isOwner) {
      throw new TRPCError({ code: 'NOT_FOUND', message: RESOURCE_NOT_FOUND_OR_FORBIDDEN })
    }
  }

  private async getCurrentClassForUser(userId: string): Promise<CharacterClassType> {
    const character = await this.characterService.getCurrentClass(userId)
    if (!character) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Character not found' })
    }
    const currentClass = character.classes.find((c) => c.className === character.currentClass)
    if (!currentClass) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Character class not found' })
    }
    return currentClass as unknown as CharacterClassType
  }

  private getCurrentClassFromCharacter(character: CharacterWithClasses): CharacterClassType {
    const c = character.classes.find((cl) => cl.className === character.currentClass)
    if (!c) {
      throw new TRPCError({ code: 'NOT_FOUND', message: `Character class ${character.currentClass} not found` })
    }
    return c
  }

  private get repos(): CombatRewardDeps {
    return {
      characterRepository: this.characterRepository,
      characterQuestRepository: this.characterQuestRepository,
      combatEnemyRepository: this.combatEnemyRepository,
      killRecordService: this.killRecordService,
      manaService: this.manaService
    }
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

    const currentClass = this.getCurrentClassFromCharacter(character)
    const activeQuest = await this.characterQuestRepository.findActiveByCharacterId(character.id)
    const participation: { id: string; tacticalState: TacticalStateData | null } | null = activeQuest
      ? { id: activeQuest.id, tacticalState: activeQuest.tacticalState }
      : null

    if (opts?.markPotionTurn && participation?.tacticalState?.potionUsedThisTurn) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Already used a potion this turn' })
    }

    const playerUnit = participation?.tacticalState?.units?.find((u) => u.id.startsWith('player-'))
    const currentHealth = playerUnit?.currentHealth ?? currentClass.health
    const maxHealth = playerUnit?.maxHealth ?? currentClass.maxHealth

    let healthRestored = 0
    if (consumable.effect.healHealth) {
      healthRestored = Math.min(consumable.effect.healHealth, maxHealth - currentHealth)
    }

    const newDbHealth = Math.min(currentHealth + healthRestored, maxHealth)
    await this.characterRepository.updateHealth(currentClass.id, newDbHealth, currentClass.mana)

    const newInventory = [...inventory]
    newInventory.splice(itemIndex, 1)
    await this.characterRepository.updateInventoryAndLoadout(
      character.id,
      newInventory,
      character.loadout as unknown as InventoryItem[]
    )

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
      healthRestored: healthRestored > 0 ? healthRestored : undefined
    }
  }

  // ============================================================
  // POKÉMON-STYLE COMBAT ENTRY POINTS (Phase 2A)
  // ============================================================

  async playerExecuteMove(
    userId: string,
    questId: string,
    casterId: string,
    moveId: string,
    targetIds: string[]
  ): Promise<TacticalMoveResult> {
    await this.assertQuestOwnership(questId, userId)
    if (!casterId.startsWith('player-')) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot execute move for enemy units' })
    }

    return this.withQuestLock(questId, async () => {
      // Recovery: if the turn pointer is parked on a living enemy (FE skipped
      // executeTacticalEnemyTurn after a previous player attack), run that enemy's
      // turn first so the player's move passes the turn check. If the auto-run
      // kills the player, short-circuit and return the enemy result. Otherwise
      // merge the enemy's logEntries / effects / affectedUnitIds into the player's
      // result so the FE can render both halves of this round in one response.
      const participation = await this.characterQuestRepository.findByIdWithTacticalState(questId)
      const state = participation?.tacticalState
      let precedingEnemy: TacticalMoveResult | null = null
      if (state?.units?.length && state.turnOrder.length) {
        const pendingId = state.turnOrder[state.currentTurnIndex]
        const pendingUnit = state.units.find((u) => u.id === pendingId)
        if (pendingUnit && !pendingUnit.id.startsWith('player-') && pendingUnit.currentHealth > 0) {
          const enemyResult = await executeEnemyMove({
            participationId: questId,
            enemyId: pendingUnit.id,
            repos: this.repos
          })
          const playerAfter = enemyResult.updatedState.units.find((u) => u.id.startsWith('player-'))
          if (!playerAfter || playerAfter.currentHealth <= 0) {
            return enemyResult
          }
          // Stale-target short-circuit: if every target of the queued player move is
          // missing or dead in the post-auto-run state (e.g., enemy thorns-killed itself,
          // DOT-killed itself, or this was the last enemy and combat ended), running
          // executeMove would deduct mana for a no-op. Return the enemy result instead.
          const targetsStillAlive = targetIds.some((tid) => {
            const u = enemyResult.updatedState.units.find((unit) => unit.id === tid)
            return !!u && u.currentHealth > 0
          })
          if (targetIds.length > 0 && !targetsStillAlive) {
            return enemyResult
          }
          precedingEnemy = enemyResult
        }
      }

      const currentClass = await this.getCurrentClassForUser(userId)
      const playerResult = await executeMove({
        participationId: questId,
        casterId,
        moveId,
        targetIds,
        casterMana: currentClass.mana,
        repos: this.repos
      })

      return precedingEnemy ? mergeMoveResults(precedingEnemy, playerResult) : playerResult
    })
  }

  // Serialize concurrent player actions on the same quest with a Postgres advisory
  // lock keyed by questId. Without this, two near-simultaneous executeMove calls
  // can both observe `currentTurnIndex` on a living enemy and each trigger an
  // enemy auto-turn, resulting in duplicate damage / log entries.
  private async withQuestLock<T>(questId: string, fn: () => Promise<T>): Promise<T> {
    if (!this.prisma) {
      return fn()
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${questId}))`
      return fn()
    })
  }

  async playerEnemyTurn(userId: string, questId: string, enemyId: string): Promise<TacticalMoveResult> {
    await this.assertQuestOwnership(questId, userId)
    if (enemyId.startsWith('player-')) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot execute AI turn for player units' })
    }
    return this.withQuestLock(questId, () =>
      executeEnemyMove({ participationId: questId, enemyId, repos: this.repos })
    )
  }

  async playerUsePotion(
    userId: string,
    questId: string,
    consumableId: string
  ): Promise<{ success: boolean; healthRestored?: number }> {
    await this.assertQuestOwnership(questId, userId)
    return this.useConsumable(userId, consumableId, { markPotionTurn: true })
  }
}
