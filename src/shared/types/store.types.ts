import type { ItemDefinition } from '../constants/items'
import type { InventoryItem } from './gamification.types'

export interface StoreListResult {
  items: ItemDefinition[]
  gold: number
  characterTier: number
}

export interface PurchaseResult {
  success: boolean
  purchasedItems: InventoryItem[]
  remainingGold: number
}
