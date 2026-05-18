import {
  ALL_ITEMS,
  CONSUMABLES,
  createInventoryItem,
  getConsumableById,
  getItemById
} from '@/shared/constants/items.constants'
import { ItemType, type InventoryItem } from '@shared/types/gamification.types'
import type { PurchaseResult, StoreListResult } from '@shared/types/store.types'
import { TRPCError } from '@trpc/server'
import { resourceNotFound } from '../lib/errors'
import { logger } from '../lib/logger'
import type { CharacterRepository } from '../repositories/character.repository'
import type { CharacterService } from './character.service'
import type { GuildService } from './guild.service'

const log = logger.child({ service: 'store' })

// Precomputed at module load: only pay for the guild lookup in `listAvailableItems`
// when the item catalog actually contains a guild-exclusive entry.
const CATALOG_HAS_GUILD_EXCLUSIVES = Object.values(ALL_ITEMS).some((item) => item.guildExclusive === true)

export class StoreService {
  constructor(
    private characterRepository: CharacterRepository,
    private characterService: CharacterService,
    private guildService?: GuildService
  ) {}

  async listAvailableItems(userId: string): Promise<StoreListResult> {
    const character = await this.characterRepository.findWithClasses(userId)

    if (!character) {
      log.warn({ userId }, 'listAvailableItems: character not found')
      throw resourceNotFound()
    }

    const { tier } = this.characterService.getCharacterProgress(character)
    const inventory = (character.inventory as unknown as InventoryItem[]) || []
    const loadout = (character.loadout as unknown as InventoryItem[]) || []
    const ownedItemIds = new Set([
      ...inventory.map((item) => item.definitionId),
      ...loadout.map((item) => item.definitionId)
    ])

    const guildProgression =
      CATALOG_HAS_GUILD_EXCLUSIVES && this.guildService ? await this.guildService.getMyProgression(userId) : null
    const guildTier = guildProgression?.tier ?? 0

    // Filter equipment items: must have price > 0 and not already owned.
    // Guild-exclusive items only surface when user is in a guild whose tier >= item.tier.
    const availableEquipment = Object.values(ALL_ITEMS).filter((item) => {
      if (item.price <= 0) return false
      if (ownedItemIds.has(item.id)) return false
      if (item.guildExclusive && guildTier < item.tier) return false
      return true
    })

    // Include all consumables (they are stackable, so always available)
    const availableConsumables = Object.values(CONSUMABLES)

    return {
      items: [...availableEquipment, ...availableConsumables],
      gold: character.gold,
      characterTier: tier
    }
  }

  async purchaseItems(userId: string, itemIds: string[]): Promise<PurchaseResult> {
    const character = await this.characterRepository.findWithClasses(userId)

    if (!character) {
      log.warn({ userId }, 'purchaseItems: character not found')
      throw resourceNotFound()
    }

    const { tier: characterTier } = this.characterService.getCharacterProgress(character)

    // Resolve guild tier once for the whole batch (guild-exclusive item gating).
    const hasGuildExclusiveInBatch = itemIds.some((id) => ALL_ITEMS[id]?.guildExclusive === true)
    const guildProgression =
      hasGuildExclusiveInBatch && this.guildService ? await this.guildService.getMyProgression(userId) : null
    const guildTier = guildProgression?.tier ?? 0

    // Get item definitions and calculate total cost
    const itemsToBuy = itemIds.map((id) => {
      const consumable = getConsumableById(id)
      if (consumable) {
        return consumable
      }

      const item = getItemById(id)
      if (!item) {
        log.warn({ userId, itemId: id }, 'purchaseItems: item definition not found')
        throw resourceNotFound()
      }
      if (item.price <= 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: `Item ${id} is not purchasable` })
      }
      if (item.tier > characterTier) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: `Item ${item.id} requires Tier ${item.tier}` })
      }
      if (item.guildExclusive && guildTier < item.tier) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Item ${item.id} requires a Guild of Tier ${item.tier}`
        })
      }
      return item
    })

    const totalCost = itemsToBuy.reduce((sum, item) => sum + item.price, 0)

    if (character.gold < totalCost) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Not enough gold' })
    }

    // Check if any non-consumable items are already owned
    const inventory = (character.inventory as unknown as InventoryItem[]) || []
    const loadout = (character.loadout as unknown as InventoryItem[]) || []
    const ownedItemIds = new Set([
      ...inventory.map((item) => item.definitionId),
      ...loadout.map((item) => item.definitionId)
    ])

    for (const item of itemsToBuy) {
      // Skip ownership check for consumables (they're stackable)
      if (item.type === ItemType.CONSUMABLE) continue

      if (ownedItemIds.has(item.id)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: `Item ${item.id} already owned` })
      }
    }

    // Create inventory items and update character
    // Use randomized rarity for equipment, fixed rarity for consumables
    const newItems = itemsToBuy.map((def) => {
      if (def.type === ItemType.CONSUMABLE) {
        return createInventoryItem(def)
      }

      return createInventoryItem(def)
    })

    const newInventory: any = [...inventory, ...newItems]
    const newGold = character.gold - totalCost

    await this.characterRepository.updateInventoryAndGold(character.id, newInventory, newGold)

    return {
      success: true,
      purchasedItems: newItems,
      remainingGold: newGold
    }
  }
}
