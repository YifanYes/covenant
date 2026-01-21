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
  nameKey: string
  descriptionKey: string
  type: ItemType
  tier: number
  rarity: ItemRarity
  stats: ItemStats
  price: number
}

export interface ConsumableEffect {
  healHealth?: number
  healMana?: number
}

export interface ConsumableDefinition extends ItemDefinition {
  effect: ConsumableEffect
  stackable: boolean
}

// Tier 1 Weapons
export const TIER_1_WEAPONS: Record<string, ItemDefinition> = {
  infantry_sword: {
    id: 'infantry_sword',
    nameKey: 'items.infantry_sword.name',
    descriptionKey: 'items.infantry_sword.description',
    type: ItemType.WEAPON_MELEE,
    tier: 1,
    rarity: ItemRarity.COMMON,
    stats: { attackDice: 2, speed: 2, range: 1, damageType: WeaponDamageType.PHYSICAL },
    price: 0
  },
  lucerne_hammer: {
    id: 'lucerne_hammer',
    nameKey: 'items.lucerne_hammer.name',
    descriptionKey: 'items.lucerne_hammer.description',
    type: ItemType.WEAPON_MELEE,
    tier: 1,
    rarity: ItemRarity.COMMON,
    stats: { attackDice: 3, speed: 1, range: 1, damageType: WeaponDamageType.PHYSICAL },
    price: 0
  },
  spark_pistol: {
    id: 'spark_pistol',
    nameKey: 'items.spark_pistol.name',
    descriptionKey: 'items.spark_pistol.description',
    type: ItemType.WEAPON_RANGED,
    tier: 1,
    rarity: ItemRarity.COMMON,
    stats: { attackDice: 2, speed: 2, range: 2, damageType: WeaponDamageType.PHYSICAL },
    price: 0
  },
  spark_musket: {
    id: 'spark_musket',
    nameKey: 'items.spark_musket.name',
    descriptionKey: 'items.spark_musket.description',
    type: ItemType.WEAPON_RANGED,
    tier: 1,
    rarity: ItemRarity.COMMON,
    stats: { attackDice: 3, speed: 1, range: 3, damageType: WeaponDamageType.PHYSICAL },
    price: 0
  },
  willow_wand: {
    id: 'willow_wand',
    nameKey: 'items.willow_wand.name',
    descriptionKey: 'items.willow_wand.description',
    type: ItemType.WEAPON_MAGIC,
    tier: 1,
    rarity: ItemRarity.COMMON,
    stats: { attackDice: 2, speed: 2, range: 1, damageType: WeaponDamageType.MAGIC },
    price: 0
  },
  recruit_grimoire: {
    id: 'recruit_grimoire',
    nameKey: 'items.recruit_grimoire.name',
    descriptionKey: 'items.recruit_grimoire.description',
    type: ItemType.WEAPON_MAGIC,
    tier: 1,
    rarity: ItemRarity.COMMON,
    stats: { attackDice: 3, speed: 1, range: 1, damageType: WeaponDamageType.MAGIC },
    price: 0
  }
}

// Tier 2 Weapons
export const TIER_2_WEAPONS: Record<string, ItemDefinition> = {
  official_sabre: {
    id: 'official_sabre',
    nameKey: 'items.official_sabre.name',
    descriptionKey: 'items.official_sabre.description',
    type: ItemType.WEAPON_MELEE,
    tier: 2,
    rarity: ItemRarity.RARE,
    stats: { attackDice: 3, speed: 2, range: 1, damageType: WeaponDamageType.PHYSICAL },
    price: 50
  },
  great_war_axe: {
    id: 'great_war_axe',
    nameKey: 'items.great_war_axe.name',
    descriptionKey: 'items.great_war_axe.description',
    type: ItemType.WEAPON_MELEE,
    tier: 2,
    rarity: ItemRarity.RARE,
    stats: { attackDice: 4, speed: 1, range: 1, damageType: WeaponDamageType.PHYSICAL },
    price: 50
  },
  advanced_revolver: {
    id: 'advanced_revolver',
    nameKey: 'items.advanced_revolver.name',
    descriptionKey: 'items.advanced_revolver.description',
    type: ItemType.WEAPON_RANGED,
    tier: 2,
    rarity: ItemRarity.RARE,
    stats: { attackDice: 3, speed: 2, range: 3, damageType: WeaponDamageType.PHYSICAL },
    price: 50
  },
  marksman_musket: {
    id: 'marksman_musket',
    nameKey: 'items.marksman_musket.name',
    descriptionKey: 'items.marksman_musket.description',
    type: ItemType.WEAPON_RANGED,
    tier: 2,
    rarity: ItemRarity.RARE,
    stats: { attackDice: 4, speed: 2, range: 5, damageType: WeaponDamageType.PHYSICAL },
    price: 50
  },
  ebony_staff: {
    id: 'ebony_staff',
    nameKey: 'items.ebony_staff.name',
    descriptionKey: 'items.ebony_staff.description',
    type: ItemType.WEAPON_MAGIC,
    tier: 2,
    rarity: ItemRarity.RARE,
    stats: { attackDice: 3, speed: 2, range: 2, damageType: WeaponDamageType.MAGIC },
    price: 50
  },
  arcanist_codex: {
    id: 'arcanist_codex',
    nameKey: 'items.arcanist_codex.name',
    descriptionKey: 'items.arcanist_codex.description',
    type: ItemType.WEAPON_MAGIC,
    tier: 2,
    rarity: ItemRarity.RARE,
    stats: { attackDice: 4, speed: 1, range: 3, damageType: WeaponDamageType.MAGIC },
    price: 50
  }
}

// Tier 3 Weapons
export const TIER_3_WEAPONS: Record<string, ItemDefinition> = {
  water_drop: {
    id: 'water_drop',
    nameKey: 'items.water_drop.name',
    descriptionKey: 'items.water_drop.description',
    type: ItemType.WEAPON_MELEE,
    tier: 3,
    rarity: ItemRarity.LEGENDARY,
    stats: { attackDice: 4, speed: 2, range: 1, damageType: WeaponDamageType.PHYSICAL },
    price: 150
  },
  war_breaker: {
    id: 'war_breaker',
    nameKey: 'items.war_breaker.name',
    descriptionKey: 'items.war_breaker.description',
    type: ItemType.WEAPON_MELEE,
    tier: 3,
    rarity: ItemRarity.LEGENDARY,
    stats: { attackDice: 5, speed: 1, range: 1, damageType: WeaponDamageType.PHYSICAL },
    price: 150
  },
  wind_color: {
    id: 'wind_color',
    nameKey: 'items.wind_color.name',
    descriptionKey: 'items.wind_color.description',
    type: ItemType.WEAPON_RANGED,
    tier: 3,
    rarity: ItemRarity.LEGENDARY,
    stats: { attackDice: 4, speed: 2, range: 3, damageType: WeaponDamageType.PHYSICAL },
    price: 150
  },
  the_verdict: {
    id: 'the_verdict',
    nameKey: 'items.the_verdict.name',
    descriptionKey: 'items.the_verdict.description',
    type: ItemType.WEAPON_RANGED,
    tier: 3,
    rarity: ItemRarity.LEGENDARY,
    stats: { attackDice: 5, speed: 1, range: 5, damageType: WeaponDamageType.PHYSICAL },
    price: 150
  },
  ether_whisper: {
    id: 'ether_whisper',
    nameKey: 'items.ether_whisper.name',
    descriptionKey: 'items.ether_whisper.description',
    type: ItemType.WEAPON_MAGIC,
    tier: 3,
    rarity: ItemRarity.LEGENDARY,
    stats: { attackDice: 4, speed: 2, range: 2, damageType: WeaponDamageType.MAGIC },
    price: 150
  },
  compendium_of_truths: {
    id: 'compendium_of_truths',
    nameKey: 'items.compendium_of_truths.name',
    descriptionKey: 'items.compendium_of_truths.description',
    type: ItemType.WEAPON_MAGIC,
    tier: 3,
    rarity: ItemRarity.LEGENDARY,
    stats: { attackDice: 5, speed: 1, range: 3, damageType: WeaponDamageType.MAGIC },
    price: 150
  }
}

// Tier 1 Armor
export const TIER_1_ARMOR: Record<string, ItemDefinition> = {
  chainmail: {
    id: 'chainmail',
    nameKey: 'items.chainmail.name',
    descriptionKey: 'items.chainmail.description',
    type: ItemType.ARMOR,
    tier: 1,
    rarity: ItemRarity.COMMON,
    stats: { physicalDefDice: 2, magicDefDice: 1 },
    price: 0
  },
  copper_plate_armor: {
    id: 'copper_plate_armor',
    nameKey: 'items.copper_plate_armor.name',
    descriptionKey: 'items.copper_plate_armor.description',
    type: ItemType.ARMOR,
    tier: 1,
    rarity: ItemRarity.COMMON,
    stats: { physicalDefDice: 1, magicDefDice: 2 },
    price: 0
  }
}

// Tier 2 Armor
export const TIER_2_ARMOR: Record<string, ItemDefinition> = {
  full_plate_armor: {
    id: 'full_plate_armor',
    nameKey: 'items.full_plate_armor.name',
    descriptionKey: 'items.full_plate_armor.description',
    type: ItemType.ARMOR,
    tier: 2,
    rarity: ItemRarity.RARE,
    stats: { physicalDefDice: 3, magicDefDice: 1 },
    price: 50
  },
  bronze_plate_armor: {
    id: 'bronze_plate_armor',
    nameKey: 'items.bronze_plate_armor.name',
    descriptionKey: 'items.bronze_plate_armor.description',
    type: ItemType.ARMOR,
    tier: 2,
    rarity: ItemRarity.RARE,
    stats: { physicalDefDice: 1, magicDefDice: 3 },
    price: 50
  }
}

// Tier 3 Armor
export const TIER_3_ARMOR: Record<string, ItemDefinition> = {
  gothic_armor: {
    id: 'gothic_armor',
    nameKey: 'items.gothic_armor.name',
    descriptionKey: 'items.gothic_armor.description',
    type: ItemType.ARMOR,
    tier: 3,
    rarity: ItemRarity.LEGENDARY,
    stats: { physicalDefDice: 4, magicDefDice: 2 },
    price: 150
  },
  gold_plate_armor: {
    id: 'gold_plate_armor',
    nameKey: 'items.gold_plate_armor.name',
    descriptionKey: 'items.gold_plate_armor.description',
    type: ItemType.ARMOR,
    tier: 3,
    rarity: ItemRarity.LEGENDARY,
    stats: { physicalDefDice: 2, magicDefDice: 4 },
    price: 150
  }
}

// Consumables
export const CONSUMABLES: Record<string, ConsumableDefinition> = {
  health_potion: {
    id: 'health_potion',
    nameKey: 'items.health_potion.name',
    descriptionKey: 'items.health_potion.description',
    type: ItemType.CONSUMABLE,
    tier: 1,
    rarity: ItemRarity.COMMON,
    stats: {},
    price: 25,
    effect: { healHealth: 3 },
    stackable: true
  },
  mana_potion: {
    id: 'mana_potion',
    nameKey: 'items.mana_potion.name',
    descriptionKey: 'items.mana_potion.description',
    type: ItemType.CONSUMABLE,
    tier: 1,
    rarity: ItemRarity.COMMON,
    stats: {},
    price: 25,
    effect: { healMana: 3 },
    stackable: true
  }
}

// Combined tier records
export const TIER_1_ITEMS: Record<string, ItemDefinition> = { ...TIER_1_WEAPONS, ...TIER_1_ARMOR }
export const TIER_2_ITEMS: Record<string, ItemDefinition> = { ...TIER_2_WEAPONS, ...TIER_2_ARMOR }
export const TIER_3_ITEMS: Record<string, ItemDefinition> = { ...TIER_3_WEAPONS, ...TIER_3_ARMOR }
export const ALL_ITEMS: Record<string, ItemDefinition> = { ...TIER_1_ITEMS, ...TIER_2_ITEMS, ...TIER_3_ITEMS }

// Helper functions
export function getItemById(id: string): ItemDefinition | undefined {
  return ALL_ITEMS[id]
}

export function getConsumableById(id: string): ConsumableDefinition | undefined {
  return CONSUMABLES[id]
}

export function createInventoryItem(definition: ItemDefinition): InventoryItem {
  return {
    id: crypto.randomUUID(),
    definitionId: definition.id,
    nameKey: definition.nameKey,
    descriptionKey: definition.descriptionKey,
    type: definition.type,
    tier: definition.tier,
    rarity: definition.rarity,
    stats: definition.stats as Record<string, number | undefined>,
    obtainedAt: new Date()
  }
}
