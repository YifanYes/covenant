import { ItemDefinition } from '../constants/items'
import { InventoryItem } from './gamification.types'

export interface StoreListResult {
  items: ItemDefinition[]
  gold: number
}

export interface PurchaseResult {
  success: boolean
  purchasedItems: InventoryItem[]
  remainingGold: number
}
