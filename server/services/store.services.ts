import {
  ALL_ITEMS,
  CONSUMABLES,
  createInventoryItem,
  createInventoryItemWithRandomRarity,
  getConsumableById,
  getItemById
} from '@shared/constants/items'
import { getMaterialById } from '@shared/constants/materials'
import { canPurchaseMaterial, getAvailableShopMaterials, getMaterialPrice, SHOP_MATERIALS } from '@shared/constants/shop-materials'
import { ItemType, type InventoryItem } from '@shared/types/gamification.types'
import type { MaterialPurchaseResult, ShopMaterialInfo, ShopMaterialListResult } from '@shared/types/crafting.types'
import type { PurchaseResult, StoreListResult } from '@shared/types/store.types'
import { TRPCError } from '@trpc/server'
import type { CharacterRepository } from '../repositories/character.repository'
import type { CharacterService } from './character.service'

export class StoreService {
  constructor(
    private characterRepository: CharacterRepository,
    private characterService: CharacterService
  ) {}

  async listAvailableItems(userId: string): Promise<StoreListResult> {
    const character = await this.characterRepository.findWithClasses(userId)

    if (!character) {
      throw new TRPCError({ code: 'NOT_FOUND', message: `Character ${userId} not found` })
    }

    const { tier } = this.characterService.getCharacterProgress(character)
    const inventory = (character.inventory as unknown as InventoryItem[]) || []
    const loadout = (character.loadout as unknown as InventoryItem[]) || []
    const ownedItemIds = new Set([
      ...inventory.map((item) => item.definitionId),
      ...loadout.map((item) => item.definitionId)
    ])

    // Filter equipment items: must have price > 0 and not already owned
    const availableEquipment = Object.values(ALL_ITEMS).filter((item) => item.price > 0 && !ownedItemIds.has(item.id))

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
      throw new TRPCError({ code: 'NOT_FOUND', message: `Character ${userId} not found` })
    }

    const { tier: characterTier } = this.characterService.getCharacterProgress(character)

    // Get item definitions and calculate total cost
    const itemsToBuy = itemIds.map((id) => {
      const consumable = getConsumableById(id)
      if (consumable) {
        return consumable
      }

      const item = getItemById(id)
      if (!item) {
        throw new TRPCError({ code: 'NOT_FOUND', message: `Item ${id} not found` })
      }
      if (item.price <= 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: `Item ${id} is not purchasable` })
      }
      if (item.tier > characterTier) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: `Item ${item.id} requires Tier ${item.tier}` })
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

      return createInventoryItemWithRandomRarity(def)
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

  async listMaterials(userId: string): Promise<ShopMaterialListResult> {
    const character = await this.characterRepository.findWithClasses(userId)

    if (!character) {
      throw new TRPCError({ code: 'NOT_FOUND', message: `Character ${userId} not found` })
    }

    const { tier } = this.characterService.getCharacterProgress(character)

    const availableShopMaterials = getAvailableShopMaterials(tier)

    const materials: ShopMaterialInfo[] = availableShopMaterials
      .map((sm) => {
        const material = getMaterialById(sm.materialId)
        if (!material) return null

        return {
          materialId: sm.materialId,
          material,
          price: sm.price,
          minTier: sm.minTier,
          canPurchase: tier >= sm.minTier
        }
      })
      .filter((m): m is ShopMaterialInfo => m !== null)

    return {
      materials,
      gold: character.gold,
      characterTier: tier
    }
  }

  async purchaseMaterial(userId: string, materialId: string, quantity: number): Promise<MaterialPurchaseResult> {
    const character = await this.characterRepository.findWithClasses(userId)

    if (!character) {
      throw new TRPCError({ code: 'NOT_FOUND', message: `Character ${userId} not found` })
    }

    const { tier } = this.characterService.getCharacterProgress(character)

    // Validate material exists in shop
    const shopMaterial = SHOP_MATERIALS[materialId]
    if (!shopMaterial) {
      throw new TRPCError({ code: 'NOT_FOUND', message: `Material ${materialId} not available in shop` })
    }

    // Validate tier requirement
    if (!canPurchaseMaterial(materialId, tier)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Material ${materialId} requires Tier ${shopMaterial.minTier}`
      })
    }

    // Calculate total cost
    const price = getMaterialPrice(materialId)
    if (price === undefined) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Price not found for material ${materialId}` })
    }

    const totalCost = price * quantity

    // Validate gold
    if (character.gold < totalCost) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Not enough gold' })
    }

    // Add materials to character
    const materialsToAdd: Record<string, number> = { [materialId]: quantity }
    await this.characterRepository.addMaterials(character.id, materialsToAdd)

    // Deduct gold
    const newGold = character.gold - totalCost
    await this.characterRepository.updateGold(character.id, newGold)

    return {
      success: true,
      purchasedMaterials: [{ materialId, quantity }],
      totalCost,
      remainingGold: newGold
    }
  }
}
