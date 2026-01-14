import { ALL_ITEMS, createInventoryItem, getItemById } from '@shared/constants/items'
import type { InventoryItem } from '@shared/types/gamification.types'
import { PurchaseResult, StoreListResult } from '@shared/types/store.types'
import { TRPCError } from '@trpc/server'
import type { PrismaClient } from '../generated/prisma'
import { CharacterRepository } from '../repositories/character.repository'

export class StoreService {
  private characterRepository: CharacterRepository

  constructor(private prisma: PrismaClient) {
    this.characterRepository = new CharacterRepository(prisma)
  }

  async listAvailableItems(userId: string): Promise<StoreListResult> {
    const character = await this.characterRepository.findByUserId(userId)

    if (!character) {
      throw new TRPCError({ code: 'NOT_FOUND', message: `Character ${userId} not found` })
    }

    const inventory = (character.inventory as unknown as InventoryItem[]) || []
    const ownedItemIds = new Set(inventory.map((item) => item.definitionId))

    // Filter items: must have price > 0 and not already owned
    const availableItems = ALL_ITEMS.filter((item) => item.price > 0 && !ownedItemIds.has(item.id))

    return {
      items: availableItems,
      gold: character.gold
    }
  }

  async purchaseItems(userId: string, itemIds: string[]): Promise<PurchaseResult> {
    const character = await this.characterRepository.findByUserId(userId)

    if (!character) {
      throw new TRPCError({ code: 'NOT_FOUND', message: `Character ${userId} not found` })
    }

    // Get item definitions and calculate total cost
    const itemsToBuy = itemIds.map((id) => {
      const item = getItemById(id)
      if (!item) {
        throw new TRPCError({ code: 'NOT_FOUND', message: `Item ${id} not found` })
      }
      if (item.price <= 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: `Item ${id} is not purchasable` })
      }
      return item
    })

    const totalCost = itemsToBuy.reduce((sum, item) => sum + item.price, 0)

    if (character.gold < totalCost) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Not enough gold' })
    }

    // Check if any items are already owned
    const inventory = (character.inventory as unknown as InventoryItem[]) || []
    const ownedItemIds = new Set(inventory.map((item) => item.definitionId))

    for (const item of itemsToBuy) {
      if (ownedItemIds.has(item.id)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: `Item ${item.name} already owned` })
      }
    }

    // Create inventory items and update character
    const newItems = itemsToBuy.map((def) => createInventoryItem(def))
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
