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

export class CombatService {
  constructor(
    private characterRepository: CharacterRepository,
    private characterQuestRepository: CharacterQuestRepository,
    private characterService: CharacterService,
    private combatEnemyRepository?: CombatEnemyRepository,
    private killRecordService?: KillRecordService,
    private manaService?: ManaService
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
    const currentClass = await this.getCurrentClassForUser(userId)
    return executeMove({
      participationId: questId,
      casterId,
      moveId,
      targetIds,
      casterMana: currentClass.mana,
      repos: this.repos
    })
  }

  async playerEnemyTurn(userId: string, questId: string, enemyId: string): Promise<TacticalMoveResult> {
    await this.assertQuestOwnership(questId, userId)
    if (enemyId.startsWith('player-')) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot execute AI turn for player units' })
    }
    return executeEnemyMove({ participationId: questId, enemyId, repos: this.repos })
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
