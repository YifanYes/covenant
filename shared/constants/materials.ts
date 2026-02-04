// Material Categories
export const MaterialCategory = {
  ORE: 'ORE',
  ESSENCE: 'ESSENCE',
  FRAGMENT: 'FRAGMENT',
  COMPONENT: 'COMPONENT'
} as const
export type MaterialCategory = (typeof MaterialCategory)[keyof typeof MaterialCategory]

// Material Rarity
export const MaterialRarity = {
  COMMON: 'COMMON',
  UNCOMMON: 'UNCOMMON',
  RARE: 'RARE',
  LEGENDARY: 'LEGENDARY'
} as const
export type MaterialRarity = (typeof MaterialRarity)[keyof typeof MaterialRarity]

// Material Definition
export interface MaterialDefinition {
  id: string
  nameKey: string
  descriptionKey: string
  category: MaterialCategory
  tier: number
  rarity: MaterialRarity
  isDroppable: boolean // false = shop only
}

// Tier 1: Materiales Mundanos
export const TIER_1_MATERIALS: Record<string, MaterialDefinition> = {
  functional_steel: {
    id: 'functional_steel',
    nameKey: 'materials.functional_steel.name',
    descriptionKey: 'materials.functional_steel.description',
    category: MaterialCategory.ORE,
    tier: 1,
    rarity: MaterialRarity.COMMON,
    isDroppable: false // Shop only
  },
  willow_wood: {
    id: 'willow_wood',
    nameKey: 'materials.willow_wood.name',
    descriptionKey: 'materials.willow_wood.description',
    category: MaterialCategory.ESSENCE,
    tier: 1,
    rarity: MaterialRarity.COMMON,
    isDroppable: true
  },
  copper: {
    id: 'copper',
    nameKey: 'materials.copper.name',
    descriptionKey: 'materials.copper.description',
    category: MaterialCategory.ESSENCE,
    tier: 1,
    rarity: MaterialRarity.COMMON,
    isDroppable: false // Shop only
  },
  quartz_crystal: {
    id: 'quartz_crystal',
    nameKey: 'materials.quartz_crystal.name',
    descriptionKey: 'materials.quartz_crystal.description',
    category: MaterialCategory.FRAGMENT,
    tier: 1,
    rarity: MaterialRarity.RARE,
    isDroppable: true
  }
}

// Tier 2: Materiales Tratados
export const TIER_2_MATERIALS: Record<string, MaterialDefinition> = {
  reinforced_steel: {
    id: 'reinforced_steel',
    nameKey: 'materials.reinforced_steel.name',
    descriptionKey: 'materials.reinforced_steel.description',
    category: MaterialCategory.ORE,
    tier: 2,
    rarity: MaterialRarity.UNCOMMON,
    isDroppable: false // Shop only
  },
  cold_iron: {
    id: 'cold_iron',
    nameKey: 'materials.cold_iron.name',
    descriptionKey: 'materials.cold_iron.description',
    category: MaterialCategory.ORE,
    tier: 2,
    rarity: MaterialRarity.RARE,
    isDroppable: true
  }
}

// Tier 3: Materiales Nobles
export const TIER_3_MATERIALS: Record<string, MaterialDefinition> = {
  sacred_steel: {
    id: 'sacred_steel',
    nameKey: 'materials.sacred_steel.name',
    descriptionKey: 'materials.sacred_steel.description',
    category: MaterialCategory.ORE,
    tier: 3,
    rarity: MaterialRarity.RARE,
    isDroppable: false // Shop only
  },
  silver: {
    id: 'silver',
    nameKey: 'materials.silver.name',
    descriptionKey: 'materials.silver.description',
    category: MaterialCategory.ESSENCE,
    tier: 3,
    rarity: MaterialRarity.UNCOMMON,
    isDroppable: true
  },
  gold_material: {
    id: 'gold_material',
    nameKey: 'materials.gold_material.name',
    descriptionKey: 'materials.gold_material.description',
    category: MaterialCategory.ESSENCE,
    tier: 3,
    rarity: MaterialRarity.RARE,
    isDroppable: true
  },
  ether: {
    id: 'ether',
    nameKey: 'materials.ether.name',
    descriptionKey: 'materials.ether.description',
    category: MaterialCategory.ESSENCE,
    tier: 3,
    rarity: MaterialRarity.LEGENDARY,
    isDroppable: true
  },
  iridium: {
    id: 'iridium',
    nameKey: 'materials.iridium.name',
    descriptionKey: 'materials.iridium.description',
    category: MaterialCategory.FRAGMENT,
    tier: 3,
    rarity: MaterialRarity.LEGENDARY,
    isDroppable: true
  }
}

// Combined materials
export const ALL_MATERIALS: Record<string, MaterialDefinition> = {
  ...TIER_1_MATERIALS,
  ...TIER_2_MATERIALS,
  ...TIER_3_MATERIALS
}

// Helper functions
export function getMaterialById(id: string): MaterialDefinition | undefined {
  return ALL_MATERIALS[id]
}

export function getMaterialsByTier(tier: number): MaterialDefinition[] {
  return Object.values(ALL_MATERIALS).filter((m) => m.tier === tier)
}

export function getMaterialsByCategory(category: MaterialCategory): MaterialDefinition[] {
  return Object.values(ALL_MATERIALS).filter((m) => m.category === category)
}

export function getDroppableMaterials(): MaterialDefinition[] {
  return Object.values(ALL_MATERIALS).filter((m) => m.isDroppable)
}

export function getShopMaterials(): MaterialDefinition[] {
  return Object.values(ALL_MATERIALS).filter((m) => !m.isDroppable)
}
