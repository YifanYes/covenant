// Recipe Categories
export const RecipeCategory = {
  WEAPON: 'weapon',
  ARMOR: 'armor',
  CONSUMABLE: 'consumable',
  ACCESSORY: 'accessory'
} as const
export type RecipeCategory = (typeof RecipeCategory)[keyof typeof RecipeCategory]

// Recipe Ingredient
export interface RecipeIngredient {
  materialId: string
  quantity: number
}

// Recipe Definition
export interface RecipeDefinition {
  id: string
  nameKey: string
  descriptionKey: string
  category: RecipeCategory
  tier: number
  ingredients: RecipeIngredient[]
  goldCost: number
  resultItemId: string
  resultQuantity: number
}

// Tier 1 Recipes (Unlocked at Tier 1)
export const TIER_1_RECIPES: Record<string, RecipeDefinition> = {
  health_potion_recipe: {
    id: 'health_potion_recipe',
    nameKey: 'recipes.health_potion.name',
    descriptionKey: 'recipes.health_potion.description',
    category: RecipeCategory.CONSUMABLE,
    tier: 1,
    ingredients: [{ materialId: 'quartz_crystal', quantity: 2 }],
    goldCost: 10,
    resultItemId: 'health_potion',
    resultQuantity: 3
  },
  mana_potion_recipe: {
    id: 'mana_potion_recipe',
    nameKey: 'recipes.mana_potion.name',
    descriptionKey: 'recipes.mana_potion.description',
    category: RecipeCategory.CONSUMABLE,
    tier: 1,
    ingredients: [{ materialId: 'willow_wood', quantity: 2 }],
    goldCost: 10,
    resultItemId: 'mana_potion',
    resultQuantity: 3
  }
}

// Tier 2 Recipes (Unlocked at Tier 2)
export const TIER_2_RECIPES: Record<string, RecipeDefinition> = {
  official_sabre_recipe: {
    id: 'official_sabre_recipe',
    nameKey: 'recipes.official_sabre.name',
    descriptionKey: 'recipes.official_sabre.description',
    category: RecipeCategory.WEAPON,
    tier: 2,
    ingredients: [
      { materialId: 'functional_steel', quantity: 5 },
      { materialId: 'reinforced_steel', quantity: 2 }
    ],
    goldCost: 30,
    resultItemId: 'official_sabre',
    resultQuantity: 1
  },
  great_war_axe_recipe: {
    id: 'great_war_axe_recipe',
    nameKey: 'recipes.great_war_axe.name',
    descriptionKey: 'recipes.great_war_axe.description',
    category: RecipeCategory.WEAPON,
    tier: 2,
    ingredients: [
      { materialId: 'functional_steel', quantity: 6 },
      { materialId: 'cold_iron', quantity: 3 }
    ],
    goldCost: 40,
    resultItemId: 'great_war_axe',
    resultQuantity: 1
  },
  advanced_revolver_recipe: {
    id: 'advanced_revolver_recipe',
    nameKey: 'recipes.advanced_revolver.name',
    descriptionKey: 'recipes.advanced_revolver.description',
    category: RecipeCategory.WEAPON,
    tier: 2,
    ingredients: [
      { materialId: 'reinforced_steel', quantity: 3 },
      { materialId: 'copper', quantity: 2 }
    ],
    goldCost: 30,
    resultItemId: 'advanced_revolver',
    resultQuantity: 1
  },
  ebony_staff_recipe: {
    id: 'ebony_staff_recipe',
    nameKey: 'recipes.ebony_staff.name',
    descriptionKey: 'recipes.ebony_staff.description',
    category: RecipeCategory.WEAPON,
    tier: 2,
    ingredients: [
      { materialId: 'willow_wood', quantity: 4 },
      { materialId: 'quartz_crystal', quantity: 2 }
    ],
    goldCost: 30,
    resultItemId: 'ebony_staff',
    resultQuantity: 1
  },
  arcanist_codex_recipe: {
    id: 'arcanist_codex_recipe',
    nameKey: 'recipes.arcanist_codex.name',
    descriptionKey: 'recipes.arcanist_codex.description',
    category: RecipeCategory.WEAPON,
    tier: 2,
    ingredients: [
      { materialId: 'willow_wood', quantity: 3 },
      { materialId: 'quartz_crystal', quantity: 3 }
    ],
    goldCost: 40,
    resultItemId: 'arcanist_codex',
    resultQuantity: 1
  },
  cold_iron_armor_recipe: {
    id: 'cold_iron_armor_recipe',
    nameKey: 'recipes.cold_iron_armor.name',
    descriptionKey: 'recipes.cold_iron_armor.description',
    category: RecipeCategory.ARMOR,
    tier: 2,
    ingredients: [
      { materialId: 'reinforced_steel', quantity: 6 },
      { materialId: 'cold_iron', quantity: 3 }
    ],
    goldCost: 50,
    resultItemId: 'full_plate_armor',
    resultQuantity: 1
  },
  bronze_plate_armor_recipe: {
    id: 'bronze_plate_armor_recipe',
    nameKey: 'recipes.bronze_plate_armor.name',
    descriptionKey: 'recipes.bronze_plate_armor.description',
    category: RecipeCategory.ARMOR,
    tier: 2,
    ingredients: [
      { materialId: 'copper', quantity: 4 },
      { materialId: 'quartz_crystal', quantity: 2 }
    ],
    goldCost: 40,
    resultItemId: 'bronze_plate_armor',
    resultQuantity: 1
  }
}

// Tier 3 Recipes (Unlocked at Tier 3)
export const TIER_3_RECIPES: Record<string, RecipeDefinition> = {
  water_drop_recipe: {
    id: 'water_drop_recipe',
    nameKey: 'recipes.water_drop.name',
    descriptionKey: 'recipes.water_drop.description',
    category: RecipeCategory.WEAPON,
    tier: 3,
    ingredients: [
      { materialId: 'sacred_steel', quantity: 4 },
      { materialId: 'silver', quantity: 2 },
      { materialId: 'quartz_crystal', quantity: 3 }
    ],
    goldCost: 100,
    resultItemId: 'water_drop',
    resultQuantity: 1
  },
  war_breaker_recipe: {
    id: 'war_breaker_recipe',
    nameKey: 'recipes.war_breaker.name',
    descriptionKey: 'recipes.war_breaker.description',
    category: RecipeCategory.WEAPON,
    tier: 3,
    ingredients: [
      { materialId: 'sacred_steel', quantity: 5 },
      { materialId: 'cold_iron', quantity: 3 },
      { materialId: 'silver', quantity: 2 }
    ],
    goldCost: 120,
    resultItemId: 'war_breaker',
    resultQuantity: 1
  },
  wind_color_recipe: {
    id: 'wind_color_recipe',
    nameKey: 'recipes.wind_color.name',
    descriptionKey: 'recipes.wind_color.description',
    category: RecipeCategory.WEAPON,
    tier: 3,
    ingredients: [
      { materialId: 'sacred_steel', quantity: 3 },
      { materialId: 'silver', quantity: 2 },
      { materialId: 'quartz_crystal', quantity: 2 }
    ],
    goldCost: 100,
    resultItemId: 'wind_color',
    resultQuantity: 1
  },
  ether_whisper_recipe: {
    id: 'ether_whisper_recipe',
    nameKey: 'recipes.ether_whisper.name',
    descriptionKey: 'recipes.ether_whisper.description',
    category: RecipeCategory.WEAPON,
    tier: 3,
    ingredients: [
      { materialId: 'ether', quantity: 3 },
      { materialId: 'gold_material', quantity: 4 },
      { materialId: 'iridium', quantity: 2 }
    ],
    goldCost: 150,
    resultItemId: 'ether_whisper',
    resultQuantity: 1
  },
  compendium_of_truths_recipe: {
    id: 'compendium_of_truths_recipe',
    nameKey: 'recipes.compendium_of_truths.name',
    descriptionKey: 'recipes.compendium_of_truths.description',
    category: RecipeCategory.WEAPON,
    tier: 3,
    ingredients: [
      { materialId: 'ether', quantity: 4 },
      { materialId: 'gold_material', quantity: 3 },
      { materialId: 'iridium', quantity: 3 }
    ],
    goldCost: 180,
    resultItemId: 'compendium_of_truths',
    resultQuantity: 1
  },
  gothic_armor_recipe: {
    id: 'gothic_armor_recipe',
    nameKey: 'recipes.gothic_armor.name',
    descriptionKey: 'recipes.gothic_armor.description',
    category: RecipeCategory.ARMOR,
    tier: 3,
    ingredients: [
      { materialId: 'sacred_steel', quantity: 6 },
      { materialId: 'cold_iron', quantity: 4 }
    ],
    goldCost: 100,
    resultItemId: 'gothic_armor',
    resultQuantity: 1
  },
  gold_plate_armor_recipe: {
    id: 'gold_plate_armor_recipe',
    nameKey: 'recipes.gold_plate_armor.name',
    descriptionKey: 'recipes.gold_plate_armor.description',
    category: RecipeCategory.ARMOR,
    tier: 3,
    ingredients: [
      { materialId: 'gold_material', quantity: 5 },
      { materialId: 'ether', quantity: 3 },
      { materialId: 'silver', quantity: 2 }
    ],
    goldCost: 120,
    resultItemId: 'gold_plate_armor',
    resultQuantity: 1
  }
}

// Combined recipes
export const ALL_RECIPES: Record<string, RecipeDefinition> = {
  ...TIER_1_RECIPES,
  ...TIER_2_RECIPES,
  ...TIER_3_RECIPES
}

// Helper functions
export function getRecipeById(id: string): RecipeDefinition | undefined {
  return ALL_RECIPES[id]
}

export function getRecipesByTier(tier: number): RecipeDefinition[] {
  return Object.values(ALL_RECIPES).filter((r) => r.tier === tier)
}

export function getRecipesByCategory(category: RecipeCategory): RecipeDefinition[] {
  return Object.values(ALL_RECIPES).filter((r) => r.category === category)
}

export function getAvailableRecipes(characterTier: number): RecipeDefinition[] {
  return Object.values(ALL_RECIPES).filter((r) => r.tier <= characterTier)
}

// Check if player has enough materials for a recipe
export function canCraftRecipe(
  recipe: RecipeDefinition,
  materials: Record<string, number>,
  gold: number
): { canCraft: boolean; missingMaterials: { materialId: string; required: number; have: number }[] } {
  const missingMaterials: { materialId: string; required: number; have: number }[] = []

  for (const ingredient of recipe.ingredients) {
    const have = materials[ingredient.materialId] || 0
    if (have < ingredient.quantity) {
      missingMaterials.push({
        materialId: ingredient.materialId,
        required: ingredient.quantity,
        have
      })
    }
  }

  const hasEnoughGold = gold >= recipe.goldCost
  const canCraft = missingMaterials.length === 0 && hasEnoughGold

  return { canCraft, missingMaterials }
}
