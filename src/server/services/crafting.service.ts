import { ALL_MATERIALS, getMaterialById, type MaterialDefinition } from '@shared/constants/materials'
import { ALL_RECIPES, canCraftRecipe, getRecipeById, type RecipeDefinition } from '@shared/constants/recipes'
import { CONSUMABLES, createInventoryItem, getItemById } from '@shared/constants/items'
import type {
  CraftResult,
  MaterialListResult,
  MaterialWithQuantity,
  RecipeListResult,
  RecipeWithStatus
} from '@shared/types/crafting.types'
import { ItemType, type InventoryItem } from '@shared/types/gamification.types'
import { TRPCError } from '@trpc/server'
import type { CharacterRepository } from '../repositories/character.repository'
import type { CharacterService } from './character.service'

export class CraftingService {
  constructor(
    private characterRepository: CharacterRepository,
    private characterService: CharacterService
  ) {}

  async getMaterials(userId: string): Promise<MaterialListResult> {
    const character = await this.characterRepository.findWithClassesOrThrow(userId)
    const { tier } = this.characterService.getCharacterProgress(character)

    const materialsData = (character.materials as Record<string, number>) || {}

    // Convert to array with material info
    const materials: MaterialWithQuantity[] = Object.entries(materialsData)
      .map(([materialId, quantity]) => {
        const material = getMaterialById(materialId)
        if (!material) return null
        return { material, quantity }
      })
      .filter((m): m is MaterialWithQuantity => m !== null)

    // Also include materials with 0 quantity that the player has seen/unlocked
    // For now, just show owned materials

    return {
      materials,
      gold: character.gold,
      characterTier: tier
    }
  }

  async listRecipes(userId: string): Promise<RecipeListResult> {
    const character = await this.characterRepository.findWithClassesOrThrow(userId)
    const { tier } = this.characterService.getCharacterProgress(character)

    const materialsData = (character.materials as Record<string, number>) || {}
    const gold = character.gold

    // Get all recipes available to the character's tier
    const availableRecipes = Object.values(ALL_RECIPES).filter((r) => r.tier <= tier)

    const recipes: RecipeWithStatus[] = availableRecipes.map((recipe) => {
      const { canCraft, missingMaterials } = canCraftRecipe(recipe, materialsData, gold)
      const hasEnoughGold = gold >= recipe.goldCost

      return {
        recipe,
        canCraft,
        missingMaterials,
        hasEnoughGold
      }
    })

    return {
      recipes,
      gold,
      characterTier: tier
    }
  }

  async craftItem(userId: string, recipeId: string): Promise<CraftResult> {
    const character = await this.characterRepository.findWithClassesOrThrow(userId)
    const { tier } = this.characterService.getCharacterProgress(character)

    // Validate recipe exists
    const recipe = getRecipeById(recipeId)
    if (!recipe) {
      throw new TRPCError({ code: 'NOT_FOUND', message: `Recipe ${recipeId} not found` })
    }

    // Validate tier requirement
    if (recipe.tier > tier) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Recipe requires Tier ${recipe.tier}, you are Tier ${tier}`
      })
    }

    const materialsData = (character.materials as Record<string, number>) || {}
    const inventory = (character.inventory as unknown as InventoryItem[]) || []

    // Validate materials and gold
    const { canCraft, missingMaterials } = canCraftRecipe(recipe, materialsData, character.gold)

    if (!canCraft) {
      if (missingMaterials.length > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Insufficient materials'
        })
      }
      if (character.gold < recipe.goldCost) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Insufficient gold'
        })
      }
    }

    // Deduct materials
    const newMaterials = { ...materialsData }
    const materialsUsed: { materialId: string; quantity: number }[] = []

    for (const ingredient of recipe.ingredients) {
      newMaterials[ingredient.materialId] = (newMaterials[ingredient.materialId] || 0) - ingredient.quantity
      if (newMaterials[ingredient.materialId] <= 0) {
        delete newMaterials[ingredient.materialId]
      }
      materialsUsed.push({ materialId: ingredient.materialId, quantity: ingredient.quantity })
    }

    // Create crafted items
    const craftedItems: InventoryItem[] = []
    const resultItem = getItemById(recipe.resultItemId) || CONSUMABLES[recipe.resultItemId]

    if (!resultItem) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Result item ${recipe.resultItemId} not found` })
    }

    for (let i = 0; i < recipe.resultQuantity; i++) {
      // Use random rarity for equipment, fixed rarity for consumables
      if (resultItem.type === ItemType.CONSUMABLE) {
        craftedItems.push(createInventoryItem(resultItem))
      } else {
        craftedItems.push(createInventoryItem(resultItem))
      }
    }

    // Deduct gold and update everything
    const newGold = character.gold - recipe.goldCost
    const newInventory = [...inventory, ...craftedItems]

    await this.characterRepository.updateMaterialsInventoryAndGold(character.id, newMaterials, newInventory, newGold)

    return {
      success: true,
      craftedItems,
      materialsUsed,
      goldSpent: recipe.goldCost
    }
  }
}
