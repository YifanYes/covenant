import { ItemRarity, ItemType, type InventoryItem } from '../types/gamification.types'

export const WeaponDamageType = {
  PHYSICAL: 'PHYSICAL',
  MAGIC: 'MAGIC'
} as const
export type WeaponDamageType = (typeof WeaponDamageType)[keyof typeof WeaponDamageType]

export interface ItemStats {
  attackDice?: number
  physicalDefDice?: number
  magicDefDice?: number
  speed?: number
  range?: number
  damageType?: WeaponDamageType
}

export interface ItemDefinition {
  id: string
  name: string
  description: string
  type: ItemType
  tier: number
  rarity: ItemRarity
  stats: ItemStats
}

export const TIER_1_WEAPONS: ItemDefinition[] = [
  {
    id: 'infantry_sword',
    name: 'Espada de Infantería',
    description: 'Acero funcional. Sencillo, brillante y letal.',
    type: ItemType.WEAPON_MELEE,
    tier: 1,
    rarity: ItemRarity.COMMON,
    stats: {
      attackDice: 2,
      speed: 2,
      range: 1,
      damageType: WeaponDamageType.PHYSICAL
    }
  },
  {
    id: 'lucerne_hammer',
    name: 'Martillo de Lucerna',
    description: 'Arma de dos manos diseñada para destrozar huesos y penetrar armaduras.',
    type: ItemType.WEAPON_MELEE,
    tier: 1,
    rarity: ItemRarity.COMMON,
    stats: {
      attackDice: 3,
      speed: 1,
      range: 1,
      damageType: WeaponDamageType.PHYSICAL
    }
  },
  {
    id: 'spark_pistol',
    name: 'Pistola de Chispa',
    description: 'Mecanismo rudo pero efectivo para la defensa personal.',
    type: ItemType.WEAPON_RANGED,
    tier: 1,
    rarity: ItemRarity.COMMON,
    stats: {
      attackDice: 2,
      speed: 2,
      range: 2,
      damageType: WeaponDamageType.PHYSICAL
    }
  },
  {
    id: 'spark_musket',
    name: 'Mosquete de Chispa',
    description: 'Arma larga con llave de chispa. Estándar de la infantería moderna temprana.',
    type: ItemType.WEAPON_RANGED,
    tier: 1,
    rarity: ItemRarity.COMMON,
    stats: {
      attackDice: 3,
      speed: 1,
      range: 3,
      damageType: WeaponDamageType.PHYSICAL
    }
  },
  {
    id: 'willow_wand',
    name: 'Vara de Sauce',
    description: 'Una vara flexible que canaliza los primeros brotes de maná.',
    type: ItemType.WEAPON_MAGIC,
    tier: 1,
    rarity: ItemRarity.COMMON,
    stats: {
      attackDice: 2,
      speed: 2,
      range: 1,
      damageType: WeaponDamageType.MAGIC
    }
  },
  {
    id: 'recruit_grimoire',
    name: 'Grimorio de Recluta',
    description: 'Contiene fórmulas mágicas básicas y directas.',
    type: ItemType.WEAPON_MAGIC,
    tier: 1,
    rarity: ItemRarity.COMMON,
    stats: {
      attackDice: 3,
      speed: 1,
      range: 1,
      damageType: WeaponDamageType.MAGIC
    }
  }
]

export const TIER_1_ARMOR: ItemDefinition[] = [
  {
    id: 'chainmail',
    name: 'Cota de Malla',
    description: 'Protección flexible basada en anillos de hierro entrelazados. Eficaz contra cortes y estocadas.',
    type: ItemType.ARMOR,
    tier: 1,
    rarity: ItemRarity.COMMON,
    stats: {
      physicalDefDice: 2,
      magicDefDice: 1
    }
  },
  {
    id: 'copper_plate_armor',
    name: 'Armadura de Placas de Cobre',
    description: 'Mejora ligeramente la canalización de maná al lanzar doctrinas.',
    type: ItemType.ARMOR,
    tier: 1,
    rarity: ItemRarity.COMMON,
    stats: {
      physicalDefDice: 1,
      magicDefDice: 2
    }
  }
]

export const TIER_1_ITEMS: ItemDefinition[] = [...TIER_1_WEAPONS, ...TIER_1_ARMOR]

export function getItemById(id: string): ItemDefinition | undefined {
  return TIER_1_ITEMS.find((item) => item.id === id)
}

export function createInventoryItem(definition: ItemDefinition): InventoryItem {
  return {
    id: crypto.randomUUID(),
    name: definition.name,
    description: definition.description,
    type: definition.type,
    tier: definition.tier,
    rarity: definition.rarity,
    stats: definition.stats,
    obtainedAt: new Date()
  }
}
