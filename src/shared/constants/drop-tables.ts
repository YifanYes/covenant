import { WeaponDamageType } from './items'

// Enemy types for drop tables
export const EnemyType = {
  MINION: 'MINION',
  ELITE: 'ELITE',
  BOSS: 'BOSS',
  SPECIAL: 'SPECIAL'
} as const
export type EnemyType = (typeof EnemyType)[keyof typeof EnemyType]

// Drop entry with material ID and drop chance (percentage)
export interface DropEntry {
  materialId: string
  chance: number // 0-100 percentage
}

// Drop table for an enemy type and damage type combination
export interface DropTable {
  enemyType: EnemyType
  damageType?: WeaponDamageType // undefined means any damage type
  drops: DropEntry[]
  minQuantity: number
  maxQuantity: number
}

// Drop tables by enemy type
export const DROP_TABLES: DropTable[] = [
  // MINION (Physical)
  {
    enemyType: EnemyType.MINION,
    damageType: WeaponDamageType.PHYSICAL,
    drops: [{ materialId: 'quartz_crystal', chance: 15 }],
    minQuantity: 1,
    maxQuantity: 2
  },
  // MINION (Magic)
  {
    enemyType: EnemyType.MINION,
    damageType: WeaponDamageType.MAGIC,
    drops: [
      { materialId: 'willow_wood', chance: 50 },
      { materialId: 'quartz_crystal', chance: 10 }
    ],
    minQuantity: 1,
    maxQuantity: 2
  },
  // ELITE (Physical)
  {
    enemyType: EnemyType.ELITE,
    damageType: WeaponDamageType.PHYSICAL,
    drops: [
      { materialId: 'quartz_crystal', chance: 30 },
      { materialId: 'cold_iron', chance: 25 }
    ],
    minQuantity: 2,
    maxQuantity: 4
  },
  // ELITE (Magic)
  {
    enemyType: EnemyType.ELITE,
    damageType: WeaponDamageType.MAGIC,
    drops: [
      { materialId: 'willow_wood', chance: 40 },
      { materialId: 'quartz_crystal', chance: 20 },
      { materialId: 'cold_iron', chance: 15 }
    ],
    minQuantity: 2,
    maxQuantity: 4
  },
  // BOSS (Physical)
  {
    enemyType: EnemyType.BOSS,
    damageType: WeaponDamageType.PHYSICAL,
    drops: [
      { materialId: 'quartz_crystal', chance: 40 },
      { materialId: 'cold_iron', chance: 30 },
      { materialId: 'silver', chance: 30 }
    ],
    minQuantity: 3,
    maxQuantity: 6
  },
  // BOSS (Magic)
  {
    enemyType: EnemyType.BOSS,
    damageType: WeaponDamageType.MAGIC,
    drops: [
      { materialId: 'willow_wood', chance: 50 },
      { materialId: 'gold_material', chance: 25 },
      { materialId: 'ether', chance: 15 }
    ],
    minQuantity: 3,
    maxQuantity: 6
  },
  // SPECIAL (any damage type)
  {
    enemyType: EnemyType.SPECIAL,
    damageType: undefined,
    drops: [
      { materialId: 'quartz_crystal', chance: 50 },
      { materialId: 'cold_iron', chance: 40 },
      { materialId: 'iridium', chance: 20 }
    ],
    minQuantity: 1,
    maxQuantity: 3
  }
]

// Material drop result
export interface MaterialDrop {
  materialId: string
  quantity: number
}

// Get the drop table for an enemy type and damage type
export function getDropTable(enemyType: EnemyType, damageType?: WeaponDamageType): DropTable | undefined {
  // First try to find an exact match with damage type
  if (damageType) {
    const exactMatch = DROP_TABLES.find((dt) => dt.enemyType === enemyType && dt.damageType === damageType)
    if (exactMatch) return exactMatch
  }

  // Fall back to any damage type table
  return DROP_TABLES.find((dt) => dt.enemyType === enemyType && dt.damageType === undefined)
}

// Roll for material drops
export function rollMaterialDrops(enemyType: EnemyType, damageType?: WeaponDamageType): MaterialDrop[] {
  const dropTable = getDropTable(enemyType, damageType)
  if (!dropTable) return []

  const drops: MaterialDrop[] = []

  for (const entry of dropTable.drops) {
    // Roll for each material
    const roll = Math.random() * 100
    if (roll < entry.chance) {
      // Calculate quantity
      const quantity =
        Math.floor(Math.random() * (dropTable.maxQuantity - dropTable.minQuantity + 1)) + dropTable.minQuantity
      drops.push({
        materialId: entry.materialId,
        quantity
      })
    }
  }

  return drops
}

// Helper to determine enemy type from template
export function getEnemyTypeFromTemplate(templateId: string): EnemyType {
  // Boss enemies
  if (
    templateId.includes('boss') ||
    templateId.includes('lord') ||
    templateId.includes('count') ||
    templateId.includes('avatar') ||
    templateId.includes('alpha')
  ) {
    return EnemyType.BOSS
  }

  // Elite enemies
  if (templateId.includes('elite') || templateId.includes('chief') || templateId.includes('tank')) {
    return EnemyType.ELITE
  }

  // Special enemies
  if (templateId.includes('special') || templateId.includes('nephilim') || templateId.includes('angel')) {
    return EnemyType.SPECIAL
  }

  // Default to minion
  return EnemyType.MINION
}
