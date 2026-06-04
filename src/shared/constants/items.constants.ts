import { ItemRarity, ItemType, type InventoryItem } from '@shared/types/gamification.types'

export const WeaponDamageType = {
  PHYSICAL: 'PHYSICAL',
  MAGIC: 'MAGIC'
} as const
export type WeaponDamageType = (typeof WeaponDamageType)[keyof typeof WeaponDamageType]

/**
 * Item stat bonuses
 * Weapons grant flat ATK; armor grants flat DEF. `speed` adds to TacticalUnitState.speed
 * for Pokémon-style turn order (higher acts first). `damageType` routes a weapon's
 * `attackBonus` to either strengthAtkBonus or magicAtkBonus at equip time.
 */
export interface ItemStats {
  strengthAtkBonus?: number
  strengthDefBonus?: number
  magicAtkBonus?: number
  magicDefBonus?: number
  speed?: number
  damageType?: WeaponDamageType
}

export interface ItemDefinition {
  id: string
  nameKey: string
  descriptionKey: string
  type: ItemType
  tier: number
  stats: ItemStats
  price: number
  /**
   * Guild-exclusive items only appear in the store for users in a guild whose
   * `Guild.tier >= ItemDefinition.tier`. Bought with regular character gold.
   */
  guildExclusive?: boolean
}

export interface ConsumableEffect {
  healHealth?: number
}

export interface ConsumableDefinition extends ItemDefinition {
  effect: ConsumableEffect
  stackable: boolean
}

export const TIER_1_WEAPONS: Record<string, ItemDefinition> = {
  infantry_sword: {
    id: 'infantry_sword',
    nameKey: 'items.infantry_sword.name',
    descriptionKey: 'items.infantry_sword.description',
    type: ItemType.WEAPON_MELEE,
    tier: 1,
    stats: { strengthAtkBonus: 2, speed: 2, damageType: WeaponDamageType.PHYSICAL },
    price: 0
  },
  lucerne_hammer: {
    id: 'lucerne_hammer',
    nameKey: 'items.lucerne_hammer.name',
    descriptionKey: 'items.lucerne_hammer.description',
    type: ItemType.WEAPON_MELEE,
    tier: 1,
    stats: { strengthAtkBonus: 3, speed: 1, damageType: WeaponDamageType.PHYSICAL },
    price: 0
  },
  spark_pistol: {
    id: 'spark_pistol',
    nameKey: 'items.spark_pistol.name',
    descriptionKey: 'items.spark_pistol.description',
    type: ItemType.WEAPON_RANGED,
    tier: 1,
    stats: { strengthAtkBonus: 2, speed: 2, damageType: WeaponDamageType.PHYSICAL },
    price: 0
  },
  spark_musket: {
    id: 'spark_musket',
    nameKey: 'items.spark_musket.name',
    descriptionKey: 'items.spark_musket.description',
    type: ItemType.WEAPON_RANGED,
    tier: 1,
    stats: { strengthAtkBonus: 3, speed: 1, damageType: WeaponDamageType.PHYSICAL },
    price: 0
  },
  willow_wand: {
    id: 'willow_wand',
    nameKey: 'items.willow_wand.name',
    descriptionKey: 'items.willow_wand.description',
    type: ItemType.WEAPON_MAGIC,
    tier: 1,
    stats: { magicAtkBonus: 2, speed: 2, damageType: WeaponDamageType.MAGIC },
    price: 0
  },
  recruit_grimoire: {
    id: 'recruit_grimoire',
    nameKey: 'items.recruit_grimoire.name',
    descriptionKey: 'items.recruit_grimoire.description',
    type: ItemType.WEAPON_MAGIC,
    tier: 1,
    stats: { magicAtkBonus: 3, speed: 1, damageType: WeaponDamageType.MAGIC },
    price: 0
  }
}

export const TIER_2_WEAPONS: Record<string, ItemDefinition> = {
  official_sabre: {
    id: 'official_sabre',
    nameKey: 'items.official_sabre.name',
    descriptionKey: 'items.official_sabre.description',
    type: ItemType.WEAPON_MELEE,
    tier: 2,
    stats: { strengthAtkBonus: 3, speed: 2, damageType: WeaponDamageType.PHYSICAL },
    price: 50
  },
  great_war_axe: {
    id: 'great_war_axe',
    nameKey: 'items.great_war_axe.name',
    descriptionKey: 'items.great_war_axe.description',
    type: ItemType.WEAPON_MELEE,
    tier: 2,
    stats: { strengthAtkBonus: 4, speed: 1, damageType: WeaponDamageType.PHYSICAL },
    price: 50
  },
  advanced_revolver: {
    id: 'advanced_revolver',
    nameKey: 'items.advanced_revolver.name',
    descriptionKey: 'items.advanced_revolver.description',
    type: ItemType.WEAPON_RANGED,
    tier: 2,
    stats: { strengthAtkBonus: 3, speed: 2, damageType: WeaponDamageType.PHYSICAL },
    price: 50
  },
  marksman_musket: {
    id: 'marksman_musket',
    nameKey: 'items.marksman_musket.name',
    descriptionKey: 'items.marksman_musket.description',
    type: ItemType.WEAPON_RANGED,
    tier: 2,
    stats: { strengthAtkBonus: 4, speed: 2, damageType: WeaponDamageType.PHYSICAL },
    price: 50
  },
  ebony_staff: {
    id: 'ebony_staff',
    nameKey: 'items.ebony_staff.name',
    descriptionKey: 'items.ebony_staff.description',
    type: ItemType.WEAPON_MAGIC,
    tier: 2,
    stats: { magicAtkBonus: 3, speed: 2, damageType: WeaponDamageType.MAGIC },
    price: 50
  },
  arcanist_codex: {
    id: 'arcanist_codex',
    nameKey: 'items.arcanist_codex.name',
    descriptionKey: 'items.arcanist_codex.description',
    type: ItemType.WEAPON_MAGIC,
    tier: 2,
    stats: { magicAtkBonus: 4, speed: 1, damageType: WeaponDamageType.MAGIC },
    price: 50
  },
  guild_vanguard_blade: {
    id: 'guild_vanguard_blade',
    nameKey: 'items.guild_vanguard_blade.name',
    descriptionKey: 'items.guild_vanguard_blade.description',
    type: ItemType.WEAPON_MELEE,
    tier: 2,
    stats: { strengthAtkBonus: 4, speed: 2, damageType: WeaponDamageType.PHYSICAL },
    price: 75,
    guildExclusive: true
  }
}

export const TIER_3_WEAPONS: Record<string, ItemDefinition> = {
  water_drop: {
    id: 'water_drop',
    nameKey: 'items.water_drop.name',
    descriptionKey: 'items.water_drop.description',
    type: ItemType.WEAPON_MELEE,
    tier: 3,
    stats: { strengthAtkBonus: 4, speed: 2, damageType: WeaponDamageType.PHYSICAL },
    price: 150
  },
  war_breaker: {
    id: 'war_breaker',
    nameKey: 'items.war_breaker.name',
    descriptionKey: 'items.war_breaker.description',
    type: ItemType.WEAPON_MELEE,
    tier: 3,
    stats: { strengthAtkBonus: 5, speed: 1, damageType: WeaponDamageType.PHYSICAL },
    price: 150
  },
  wind_color: {
    id: 'wind_color',
    nameKey: 'items.wind_color.name',
    descriptionKey: 'items.wind_color.description',
    type: ItemType.WEAPON_RANGED,
    tier: 3,
    stats: { strengthAtkBonus: 4, speed: 2, damageType: WeaponDamageType.PHYSICAL },
    price: 150
  },
  the_verdict: {
    id: 'the_verdict',
    nameKey: 'items.the_verdict.name',
    descriptionKey: 'items.the_verdict.description',
    type: ItemType.WEAPON_RANGED,
    tier: 3,
    stats: { strengthAtkBonus: 5, speed: 1, damageType: WeaponDamageType.PHYSICAL },
    price: 150
  },
  ether_whisper: {
    id: 'ether_whisper',
    nameKey: 'items.ether_whisper.name',
    descriptionKey: 'items.ether_whisper.description',
    type: ItemType.WEAPON_MAGIC,
    tier: 3,
    stats: { magicAtkBonus: 4, speed: 2, damageType: WeaponDamageType.MAGIC },
    price: 150
  },
  compendium_of_truths: {
    id: 'compendium_of_truths',
    nameKey: 'items.compendium_of_truths.name',
    descriptionKey: 'items.compendium_of_truths.description',
    type: ItemType.WEAPON_MAGIC,
    tier: 3,
    stats: { magicAtkBonus: 5, speed: 1, damageType: WeaponDamageType.MAGIC },
    price: 150
  },
  guild_oathkeeper_staff: {
    id: 'guild_oathkeeper_staff',
    nameKey: 'items.guild_oathkeeper_staff.name',
    descriptionKey: 'items.guild_oathkeeper_staff.description',
    type: ItemType.WEAPON_MAGIC,
    tier: 3,
    stats: { magicAtkBonus: 6, speed: 1, damageType: WeaponDamageType.MAGIC },
    price: 200,
    guildExclusive: true
  }
}

export const TIER_1_ARMOR: Record<string, ItemDefinition> = {
  chainmail: {
    id: 'chainmail',
    nameKey: 'items.chainmail.name',
    descriptionKey: 'items.chainmail.description',
    type: ItemType.ARMOR,
    tier: 1,
    stats: { strengthDefBonus: 2, magicDefBonus: 1 },
    price: 0
  },
  copper_plate_armor: {
    id: 'copper_plate_armor',
    nameKey: 'items.copper_plate_armor.name',
    descriptionKey: 'items.copper_plate_armor.description',
    type: ItemType.ARMOR,
    tier: 1,
    stats: { strengthDefBonus: 1, magicDefBonus: 2 },
    price: 0
  }
}

export const TIER_2_ARMOR: Record<string, ItemDefinition> = {
  full_plate_armor: {
    id: 'full_plate_armor',
    nameKey: 'items.full_plate_armor.name',
    descriptionKey: 'items.full_plate_armor.description',
    type: ItemType.ARMOR,
    tier: 2,
    stats: { strengthDefBonus: 3, magicDefBonus: 1 },
    price: 50
  },
  bronze_plate_armor: {
    id: 'bronze_plate_armor',
    nameKey: 'items.bronze_plate_armor.name',
    descriptionKey: 'items.bronze_plate_armor.description',
    type: ItemType.ARMOR,
    tier: 2,
    stats: { strengthDefBonus: 1, magicDefBonus: 3 },
    price: 50
  }
}

export const TIER_3_ARMOR: Record<string, ItemDefinition> = {
  gothic_armor: {
    id: 'gothic_armor',
    nameKey: 'items.gothic_armor.name',
    descriptionKey: 'items.gothic_armor.description',
    type: ItemType.ARMOR,
    tier: 3,
    stats: { strengthDefBonus: 4, magicDefBonus: 2 },
    price: 150
  },
  gold_plate_armor: {
    id: 'gold_plate_armor',
    nameKey: 'items.gold_plate_armor.name',
    descriptionKey: 'items.gold_plate_armor.description',
    type: ItemType.ARMOR,
    tier: 3,
    stats: { strengthDefBonus: 2, magicDefBonus: 4 },
    price: 150
  },
  guild_aegis_plate: {
    id: 'guild_aegis_plate',
    nameKey: 'items.guild_aegis_plate.name',
    descriptionKey: 'items.guild_aegis_plate.description',
    type: ItemType.ARMOR,
    tier: 3,
    stats: { strengthDefBonus: 5, magicDefBonus: 4 },
    price: 200,
    guildExclusive: true
  }
}

export const CONSUMABLES: Record<string, ConsumableDefinition> = {
  health_potion: {
    id: 'health_potion',
    nameKey: 'items.health_potion.name',
    descriptionKey: 'items.health_potion.description',
    type: ItemType.CONSUMABLE,
    tier: 1,
    stats: {},
    price: 25,
    effect: { healHealth: 15 },
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
  const rarity = rollItemRarity()
  const adjustedStats = applyRarityToStats(definition.stats, rarity)

  return {
    id: crypto.randomUUID(),
    definitionId: definition.id,
    nameKey: definition.nameKey,
    descriptionKey: definition.descriptionKey,
    type: definition.type,
    tier: definition.tier,
    rarity,
    stats: adjustedStats as Record<string, number | undefined>,
    obtainedAt: new Date()
  }
}

function getOwnedDefinitionId(item: InventoryItem): string | undefined {
  if (item.definitionId) return item.definitionId
  return TIER_1_ITEMS[item.id] ? item.id : undefined
}

export function createTier1InventoryItem(definition: ItemDefinition): InventoryItem {
  return {
    ...createInventoryItem(definition),
    id: definition.id
  }
}

export function createTier1InventoryItems(): InventoryItem[] {
  return Object.values(TIER_1_ITEMS).map(createTier1InventoryItem)
}

export function addMissingTier1InventoryItems(
  inventory: InventoryItem[],
  loadout: InventoryItem[] = []
): { inventory: InventoryItem[]; addedItems: InventoryItem[] } {
  const ownedDefinitionIds = new Set(
    [...inventory, ...loadout]
      .map(getOwnedDefinitionId)
      .filter((definitionId): definitionId is string => definitionId !== undefined)
  )
  const addedItems = Object.values(TIER_1_ITEMS)
    .filter((definition) => !ownedDefinitionIds.has(definition.id))
    .map(createTier1InventoryItem)

  return {
    inventory: addedItems.length === 0 ? inventory : [...inventory, ...addedItems],
    addedItems
  }
}

// Rarity System
export const RARITY_WEIGHTS = {
  [ItemRarity.COMMON]: 50,
  [ItemRarity.RARE]: 30,
  [ItemRarity.LEGENDARY]: 20
} as const

export const RARITY_STAT_MULTIPLIERS = {
  [ItemRarity.COMMON]: 1.0,
  [ItemRarity.RARE]: 1.1,
  [ItemRarity.LEGENDARY]: 1.2
} as const

export function rollItemRarity(): ItemRarity {
  const entries = Object.entries(RARITY_WEIGHTS) as [ItemRarity, number][]
  const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0)
  let random = Math.random() * totalWeight

  for (const [rarity, weight] of entries) {
    random -= weight

    if (random <= 0) {
      return rarity
    }
  }

  return ItemRarity.COMMON
}

export function applyRarityToStats(stats: ItemStats, rarity: ItemRarity): ItemStats {
  const multiplier = RARITY_STAT_MULTIPLIERS[rarity]
  const newStats: ItemStats = { ...stats }

  if (stats.strengthAtkBonus !== undefined) {
    newStats.strengthAtkBonus = Math.floor(stats.strengthAtkBonus * multiplier)
  }
  if (stats.magicAtkBonus !== undefined) {
    newStats.magicAtkBonus = Math.floor(stats.magicAtkBonus * multiplier)
  }
  if (stats.strengthDefBonus !== undefined) {
    newStats.strengthDefBonus = Math.floor(stats.strengthDefBonus * multiplier)
  }
  if (stats.magicDefBonus !== undefined) {
    newStats.magicDefBonus = Math.floor(stats.magicDefBonus * multiplier)
  }

  return newStats
}

/**
 * Returns flat ATK/DEF/speed bonuses to be merged with class base stats.
 */
export function aggregateLoadoutStats(loadout: InventoryItem[]): Required<ItemStats> {
  const totals: Required<ItemStats> = {
    strengthAtkBonus: 0,
    strengthDefBonus: 0,
    magicAtkBonus: 0,
    magicDefBonus: 0,
    speed: 0,
    damageType: WeaponDamageType.PHYSICAL
  }
  for (const item of loadout) {
    const stats = (item.stats ?? {}) as Record<string, number | undefined>
    if (typeof stats.strengthAtkBonus === 'number') totals.strengthAtkBonus += stats.strengthAtkBonus
    if (typeof stats.strengthDefBonus === 'number') totals.strengthDefBonus += stats.strengthDefBonus
    if (typeof stats.magicAtkBonus === 'number') totals.magicAtkBonus += stats.magicAtkBonus
    if (typeof stats.magicDefBonus === 'number') totals.magicDefBonus += stats.magicDefBonus
    if (typeof stats.speed === 'number') totals.speed += stats.speed
  }
  return totals
}
