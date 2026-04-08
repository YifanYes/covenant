import type { MaterialDefinition } from '../constants/materials'
import type { RecipeDefinition } from '../constants/recipes'
import type { InventoryItem } from './gamification.types'

// Material inventory - maps material ID to quantity
export type MaterialInventory = Record<string, number>

// Material with quantity for display
export interface MaterialWithQuantity {
  material: MaterialDefinition
  quantity: number
}

// Recipe with craftability status
export interface RecipeWithStatus {
  recipe: RecipeDefinition
  canCraft: boolean
  missingMaterials: {
    materialId: string
    required: number
    have: number
  }[]
  hasEnoughGold: boolean
}

// Result of crafting an item
export interface CraftResult {
  success: boolean
  craftedItems: InventoryItem[]
  materialsUsed: { materialId: string; quantity: number }[]
  goldSpent: number
}

// Result of listing materials
export interface MaterialListResult {
  materials: MaterialWithQuantity[]
  gold: number
  characterTier: number
}

// Result of listing recipes
export interface RecipeListResult {
  recipes: RecipeWithStatus[]
  gold: number
  characterTier: number
}

// Material drop from combat
export interface CombatMaterialDrop {
  materialId: string
  quantity: number
}

// Shop material with price info
export interface ShopMaterialInfo {
  materialId: string
  material: MaterialDefinition
  price: number
  minTier: number
  canPurchase: boolean
}

// Result of listing shop materials
export interface ShopMaterialListResult {
  materials: ShopMaterialInfo[]
  gold: number
  characterTier: number
}

// Result of purchasing materials
export interface MaterialPurchaseResult {
  success: boolean
  purchasedMaterials: { materialId: string; quantity: number }[]
  totalCost: number
  remainingGold: number
}
