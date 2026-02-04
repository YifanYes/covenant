import { getMaterialById } from './materials'

export interface ShopMaterial {
  materialId: string
  price: number
  minTier: number // Minimum character tier to purchase
}

// Materials available in the shop with their prices
export const SHOP_MATERIALS: Record<string, ShopMaterial> = {
  functional_steel: {
    materialId: 'functional_steel',
    price: 5,
    minTier: 1
  },
  copper: {
    materialId: 'copper',
    price: 5,
    minTier: 1
  },
  reinforced_steel: {
    materialId: 'reinforced_steel',
    price: 15,
    minTier: 2
  },
  sacred_steel: {
    materialId: 'sacred_steel',
    price: 50,
    minTier: 3
  }
}

// Helper functions
export function getShopMaterial(materialId: string): ShopMaterial | undefined {
  return SHOP_MATERIALS[materialId]
}

export function getAvailableShopMaterials(characterTier: number): ShopMaterial[] {
  return Object.values(SHOP_MATERIALS).filter((sm) => sm.minTier <= characterTier)
}

export function getMaterialPrice(materialId: string): number | undefined {
  const shopMaterial = SHOP_MATERIALS[materialId]
  return shopMaterial?.price
}

export function canPurchaseMaterial(materialId: string, characterTier: number): boolean {
  const shopMaterial = SHOP_MATERIALS[materialId]
  if (!shopMaterial) return false
  return characterTier >= shopMaterial.minTier
}

// Get shop materials with full material info
export function getShopMaterialsWithInfo(characterTier: number) {
  return getAvailableShopMaterials(characterTier).map((sm) => ({
    ...sm,
    material: getMaterialById(sm.materialId)
  }))
}
