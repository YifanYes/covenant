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
  price: number
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
    },
    price: 0
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
    },
    price: 0
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
    },
    price: 0
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
    },
    price: 0
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
    },
    price: 0
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
    },
    price: 0
  }
]

export const TIER_2_WEAPONS: ItemDefinition[] = [
  {
    id: 'official_sabre',
    name: 'Sable de Oficial',
    description: 'Hoja grabada con insignias de mando. Otorga +1 a la Velocidad solo en el primer turno.',
    type: ItemType.WEAPON_MELEE,
    tier: 2,
    rarity: ItemRarity.RARE,
    stats: {
      attackDice: 3,
      speed: 2,
      range: 1,
      damageType: WeaponDamageType.PHYSICAL
    },
    price: 50
  },
  {
    id: 'great_war_axe',
    name: 'Gran Hacha de Guerra',
    description: 'Arma brutal. Los éxitos críticos (6 natural) ignoran 1 dado de defensa del enemigo.',
    type: ItemType.WEAPON_MELEE,
    tier: 2,
    rarity: ItemRarity.RARE,
    stats: {
      attackDice: 4,
      speed: 1,
      range: 1,
      damageType: WeaponDamageType.PHYSICAL
    },
    price: 50
  },
  {
    id: 'advanced_revolver',
    name: 'Revolver Avanzado',
    description: 'Ingeniería moderna. Permite repetir un dado de ataque una vez por combate.',
    type: ItemType.WEAPON_RANGED,
    tier: 2,
    rarity: ItemRarity.RARE,
    stats: {
      attackDice: 3,
      speed: 2,
      range: 3,
      damageType: WeaponDamageType.PHYSICAL
    },
    price: 50
  },
  {
    id: 'marksman_musket',
    name: 'Mosquete de Tirador',
    description: 'Cañón estriado de alta precisión para distancias extremas.',
    type: ItemType.WEAPON_RANGED,
    tier: 2,
    rarity: ItemRarity.RARE,
    stats: {
      attackDice: 4,
      speed: 2,
      range: 5,
      damageType: WeaponDamageType.PHYSICAL
    },
    price: 50
  },
  {
    id: 'ebony_staff',
    name: 'Báculo de Ébano',
    description: 'Madera oscura. Reduce en 1 el coste de maná de la primera doctrina usada.',
    type: ItemType.WEAPON_MAGIC,
    tier: 2,
    rarity: ItemRarity.RARE,
    stats: {
      attackDice: 3,
      speed: 2,
      range: 2,
      damageType: WeaponDamageType.MAGIC
    },
    price: 50
  },
  {
    id: 'arcanist_codex',
    name: 'Codex de Arcanista',
    description: 'Tomo de cuero de bestia. +1 Impacto adicional si el atacante no se ha movido.',
    type: ItemType.WEAPON_MAGIC,
    tier: 2,
    rarity: ItemRarity.RARE,
    stats: {
      attackDice: 4,
      speed: 1,
      range: 3,
      damageType: WeaponDamageType.MAGIC
    },
    price: 50
  }
]

export const TIER_3_WEAPONS: ItemDefinition[] = [
  {
    id: 'water_drop',
    name: 'Gota de Agua',
    description: 'Hoja de filo legendario. Aumenta la Velocidad base en +1 de forma permanente.',
    type: ItemType.WEAPON_MELEE,
    tier: 3,
    rarity: ItemRarity.LEGENDARY,
    stats: {
      attackDice: 4,
      speed: 2,
      range: 1,
      damageType: WeaponDamageType.PHYSICAL
    },
    price: 150
  },
  {
    id: 'war_breaker',
    name: 'Rompe-Guerras',
    description: 'Martillo monumental. Un impacto crítico (6 natural) aturde al enemigo.',
    type: ItemType.WEAPON_MELEE,
    tier: 3,
    rarity: ItemRarity.LEGENDARY,
    stats: {
      attackDice: 5,
      speed: 1,
      range: 1,
      damageType: WeaponDamageType.PHYSICAL
    },
    price: 150
  },
  {
    id: 'wind_color',
    name: 'Color del Viento',
    description: 'Pistola aerodinámica. Aumenta el rango efectivo en +1.',
    type: ItemType.WEAPON_RANGED,
    tier: 3,
    rarity: ItemRarity.LEGENDARY,
    stats: {
      attackDice: 4,
      speed: 2,
      range: 3,
      damageType: WeaponDamageType.PHYSICAL
    },
    price: 150
  },
  {
    id: 'the_verdict',
    name: 'El Veredicto',
    description: 'Cañón de mano pesado. +1 dado de ataque contra enemigos con <50% de vida.',
    type: ItemType.WEAPON_RANGED,
    tier: 3,
    rarity: ItemRarity.LEGENDARY,
    stats: {
      attackDice: 5,
      speed: 1,
      range: 5,
      damageType: WeaponDamageType.PHYSICAL
    },
    price: 150
  },
  {
    id: 'ether_whisper',
    name: 'Susurro del Éter',
    description: 'Vara de cristal. Permite realizar ataques mágicos teledirigidos.',
    type: ItemType.WEAPON_MAGIC,
    tier: 3,
    rarity: ItemRarity.LEGENDARY,
    stats: {
      attackDice: 4,
      speed: 2,
      range: 2,
      damageType: WeaponDamageType.MAGIC
    },
    price: 150
  },
  {
    id: 'compendium_of_truths',
    name: 'Compendio de Verdades',
    description: 'Secretos fundamentales. Al lanzar una doctrina, lanza 1 dado extra.',
    type: ItemType.WEAPON_MAGIC,
    tier: 3,
    rarity: ItemRarity.LEGENDARY,
    stats: {
      attackDice: 5,
      speed: 1,
      range: 3,
      damageType: WeaponDamageType.MAGIC
    },
    price: 150
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
    },
    price: 0
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
    },
    price: 0
  }
]

export const TIER_2_ARMOR: ItemDefinition[] = [
  {
    id: 'full_plate_armor',
    name: 'Armadura de Placas Completa',
    description: 'Láminas de acero entrelazadas. Aumenta las Heridas máximas en +1 mientras se porte.',
    type: ItemType.ARMOR,
    tier: 2,
    rarity: ItemRarity.RARE,
    stats: {
      physicalDefDice: 3,
      magicDefDice: 1
    },
    price: 50
  },
  {
    id: 'bronze_plate_armor',
    name: 'Armadura de Placas de Bronce',
    description: 'Aleación conductora. Restaura 1 de maná al comienzo de cada encuentro.',
    type: ItemType.ARMOR,
    tier: 2,
    rarity: ItemRarity.RARE,
    stats: {
      physicalDefDice: 1,
      magicDefDice: 3
    },
    price: 50
  }
]

export const TIER_3_ARMOR: ItemDefinition[] = [
  {
    id: 'gothic_armor',
    name: 'Armadura Gótica',
    description: 'Refractan la fuerza de los golpes. Si bloqueas todos los ataques, el enemigo es empujado.',
    type: ItemType.ARMOR,
    tier: 3,
    rarity: ItemRarity.LEGENDARY,
    stats: {
      physicalDefDice: 4,
      magicDefDice: 2
    },
    price: 150
  },
  {
    id: 'gold_plate_armor',
    name: 'Armadura de Placas de Oro',
    description: 'Espejo místico. Una vez por combate, devuelve 1 impacto mágico bloqueado.',
    type: ItemType.ARMOR,
    tier: 3,
    rarity: ItemRarity.LEGENDARY,
    stats: {
      physicalDefDice: 2,
      magicDefDice: 4
    },
    price: 150
  }
]

export const TIER_1_ITEMS: ItemDefinition[] = [...TIER_1_WEAPONS, ...TIER_1_ARMOR]
export const TIER_2_ITEMS: ItemDefinition[] = [...TIER_2_WEAPONS, ...TIER_2_ARMOR]
export const TIER_3_ITEMS: ItemDefinition[] = [...TIER_3_WEAPONS, ...TIER_3_ARMOR]
export const ALL_ITEMS: ItemDefinition[] = [...TIER_1_ITEMS, ...TIER_2_ITEMS, ...TIER_3_ITEMS]

export function getItemById(id: string): ItemDefinition | undefined {
  return ALL_ITEMS.find((item) => item.id === id)
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
