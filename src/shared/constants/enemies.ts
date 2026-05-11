export const DamageType = {
  PHYSICAL: 'PHYSICAL',
  MAGIC: 'MAGIC',
  BOTH: 'BOTH'
} as const
export type DamageType = (typeof DamageType)[keyof typeof DamageType]

export const EnemyType = {
  MINION: 'MINION',
  ELITE: 'ELITE',
  BOSS: 'BOSS'
} as const
export type EnemyType = (typeof EnemyType)[keyof typeof EnemyType]

export interface EnemyTemplate {
  id: string
  name: string
  imageId: string // image asset ID (allows variants to share images)
  tier: number
  type: EnemyType
  health: number
  mana: number
  speed: number
  damageType: DamageType
  strengthAtk: number
  strengthDef: number
  magicAtk: number
  magicDef: number
  manaRegen: number
  // Pool of move IDs the AI may pick from this turn. Always include 'basic_strike' as fallback.
  moves: string[]
  // Gold reward range on defeat
  goldReward: { min: number; max: number }
}

// Phase 2A: HP literals ×5 vs. pre-redesign values. Balance pass is Phase 2B.
export const ENEMIES: Record<string, EnemyTemplate> = {
  // Tier 1
  skeleton: {
    id: 'skeleton',
    name: 'enemies.skeleton',
    imageId: 'skeleton',
    tier: 1,
    type: EnemyType.MINION,
    health: 15,
    mana: 0,
    speed: 1,
    damageType: DamageType.PHYSICAL,
    strengthAtk: 5,
    strengthDef: 5,
    magicAtk: 6,
    magicDef: 6,
    manaRegen: 0,
    moves: ['basic_strike'],
    goldReward: { min: 8, max: 12 }
  },
  bandit_chief: {
    id: 'bandit_chief',
    name: 'enemies.bandit_chief',
    imageId: 'bandit_chief',
    tier: 1,
    type: EnemyType.ELITE,
    health: 25,
    mana: 0,
    speed: 1,
    damageType: DamageType.PHYSICAL,
    strengthAtk: 4,
    strengthDef: 4,
    magicAtk: 6,
    magicDef: 5,
    manaRegen: 0,
    moves: ['basic_strike'],
    goldReward: { min: 15, max: 25 }
  },
  bandit_runic: {
    id: 'bandit_runic',
    name: 'enemies.bandit_runic',
    imageId: 'bandit_runic',
    tier: 1,
    type: EnemyType.MINION,
    health: 20,
    mana: 3,
    speed: 1,
    damageType: DamageType.MAGIC,
    strengthAtk: 5,
    strengthDef: 5,
    magicAtk: 4,
    magicDef: 3,
    manaRegen: 1,
    moves: ['basic_strike'],
    goldReward: { min: 10, max: 15 }
  },
  bandit_stalker: {
    id: 'bandit_stalker',
    name: 'enemies.bandit_stalker',
    imageId: 'bandit_stalker',
    tier: 1,
    type: EnemyType.MINION,
    health: 20,
    mana: 0,
    speed: 1,
    damageType: DamageType.PHYSICAL,
    strengthAtk: 4,
    strengthDef: 3,
    magicAtk: 6,
    magicDef: 5,
    manaRegen: 0,
    moves: ['basic_strike'],
    goldReward: { min: 10, max: 14 }
  },
  fallen_templar: {
    id: 'fallen_templar',
    name: 'enemies.fallen_templar',
    imageId: 'heretic_templar',
    tier: 1,
    type: EnemyType.MINION,
    health: 20,
    mana: 2,
    speed: 1,
    damageType: DamageType.PHYSICAL,
    strengthAtk: 4,
    strengthDef: 4,
    magicAtk: 5,
    magicDef: 5,
    manaRegen: 1,
    moves: ['basic_strike'],
    goldReward: { min: 10, max: 15 }
  },
  ghost: {
    id: 'ghost',
    name: 'enemies.ghost',
    imageId: 'ghost',
    tier: 1,
    type: EnemyType.MINION,
    health: 10,
    mana: 3,
    speed: 1,
    damageType: DamageType.MAGIC,
    strengthAtk: 6,
    strengthDef: 6,
    magicAtk: 4,
    magicDef: 4,
    manaRegen: 1,
    moves: ['basic_strike'],
    goldReward: { min: 8, max: 12 }
  },
  giant_spider: {
    id: 'giant_spider',
    name: 'enemies.giant_spider',
    imageId: 'spider',
    tier: 1,
    type: EnemyType.MINION,
    health: 20,
    mana: 0,
    speed: 1,
    damageType: DamageType.PHYSICAL,
    strengthAtk: 4,
    strengthDef: 5,
    magicAtk: 6,
    magicDef: 6,
    manaRegen: 0,
    moves: ['basic_strike'],
    goldReward: { min: 10, max: 14 }
  },
  magma_demon: {
    id: 'magma_demon',
    name: 'enemies.magma_demon',
    imageId: 'magma_demon',
    tier: 1,
    type: EnemyType.MINION,
    health: 40,
    mana: 4,
    speed: 1,
    damageType: DamageType.MAGIC,
    strengthAtk: 4,
    strengthDef: 2,
    magicAtk: 4,
    magicDef: 5,
    manaRegen: 1,
    moves: ['basic_strike'],
    goldReward: { min: 12, max: 18 }
  },
  shadow_demon: {
    id: 'shadow_demon',
    name: 'enemies.shadow_demon',
    imageId: 'shadow_demon',
    tier: 1,
    type: EnemyType.MINION,
    health: 30,
    mana: 5,
    speed: 1,
    damageType: DamageType.MAGIC,
    strengthAtk: 5,
    strengthDef: 4,
    magicAtk: 3,
    magicDef: 3,
    manaRegen: 2,
    moves: ['basic_strike'],
    goldReward: { min: 12, max: 18 }
  },
  // Tier 2
  fallen_inquisitor: {
    id: 'fallen_inquisitor',
    name: 'enemies.fallen_inquisitor',
    imageId: 'heretic_templar',
    tier: 2,
    type: EnemyType.MINION,
    health: 25,
    mana: 4,
    speed: 1,
    damageType: DamageType.MAGIC,
    strengthAtk: 5,
    strengthDef: 5,
    magicAtk: 4,
    magicDef: 3,
    manaRegen: 2,
    moves: ['basic_strike'],
    goldReward: { min: 15, max: 22 }
  },
  armored_templar: {
    id: 'armored_templar',
    name: 'enemies.armored_templar',
    imageId: 'heretic_templar',
    tier: 2,
    type: EnemyType.ELITE,
    health: 35,
    mana: 2,
    speed: 1,
    damageType: DamageType.PHYSICAL,
    strengthAtk: 4,
    strengthDef: 2,
    magicAtk: 6,
    magicDef: 5,
    manaRegen: 1,
    moves: ['basic_strike'],
    goldReward: { min: 20, max: 30 }
  },
  werewolf: {
    id: 'werewolf',
    name: 'enemies.werewolf',
    imageId: 'young_werewolf',
    tier: 2,
    type: EnemyType.MINION,
    health: 30,
    mana: 0,
    speed: 1,
    damageType: DamageType.PHYSICAL,
    strengthAtk: 4,
    strengthDef: 3,
    magicAtk: 6,
    magicDef: 5,
    manaRegen: 0,
    moves: ['basic_strike'],
    goldReward: { min: 15, max: 22 }
  },
  werewolf_alpha: {
    id: 'werewolf_alpha',
    name: 'enemies.werewolf_alpha',
    imageId: 'alpha_werewolf',
    tier: 2,
    type: EnemyType.BOSS,
    health: 60,
    mana: 0,
    speed: 1,
    damageType: DamageType.PHYSICAL,
    strengthAtk: 3,
    strengthDef: 2,
    magicAtk: 5,
    magicDef: 4,
    manaRegen: 0,
    moves: ['basic_strike'],
    goldReward: { min: 35, max: 50 }
  },
  // Tier 3
  elite_armored_templar: {
    id: 'elite_armored_templar',
    name: 'enemies.elite_armored_templar',
    imageId: 'heretic_templar',
    tier: 3,
    type: EnemyType.BOSS,
    health: 70,
    mana: 4,
    speed: 1,
    damageType: DamageType.PHYSICAL,
    strengthAtk: 3,
    strengthDef: 2,
    magicAtk: 5,
    magicDef: 4,
    manaRegen: 1,
    moves: ['basic_strike'],
    goldReward: { min: 40, max: 60 }
  },
  shadow_demon_elite: {
    id: 'shadow_demon_elite',
    name: 'enemies.shadow_demon_elite',
    imageId: 'shadow_demon',
    tier: 3,
    type: EnemyType.MINION,
    health: 25,
    mana: 5,
    speed: 1,
    damageType: DamageType.MAGIC,
    strengthAtk: 5,
    strengthDef: 4,
    magicAtk: 3,
    magicDef: 3,
    manaRegen: 2,
    moves: ['basic_strike'],
    goldReward: { min: 18, max: 28 }
  },
  minor_demon: {
    id: 'minor_demon',
    name: 'enemies.minor_demon',
    imageId: 'shadow_demon',
    tier: 3,
    type: EnemyType.MINION,
    health: 20,
    mana: 3,
    speed: 1,
    damageType: DamageType.MAGIC,
    strengthAtk: 5,
    strengthDef: 5,
    magicAtk: 4,
    magicDef: 4,
    manaRegen: 1,
    moves: ['basic_strike'],
    goldReward: { min: 18, max: 25 }
  },
  elite_demon: {
    id: 'elite_demon',
    name: 'enemies.elite_demon',
    imageId: 'elite_demon',
    tier: 3,
    type: EnemyType.ELITE,
    health: 45,
    mana: 6,
    speed: 1,
    damageType: DamageType.MAGIC,
    strengthAtk: 4,
    strengthDef: 3,
    magicAtk: 3,
    magicDef: 3,
    manaRegen: 2,
    moves: ['basic_strike'],
    goldReward: { min: 25, max: 40 }
  },
  demon_lord: {
    id: 'demon_lord',
    name: 'enemies.demon_lord',
    imageId: 'demon_lord',
    tier: 3,
    type: EnemyType.BOSS,
    health: 80,
    mana: 10,
    speed: 1,
    damageType: DamageType.BOTH,
    strengthAtk: 3,
    strengthDef: 3,
    magicAtk: 3,
    magicDef: 3,
    manaRegen: 3,
    moves: ['basic_strike'],
    goldReward: { min: 45, max: 70 }
  },
  fallen_inquisitor_boss: {
    id: 'fallen_inquisitor_boss',
    name: 'enemies.fallen_inquisitor_boss',
    imageId: 'heretic_templar',
    tier: 3,
    type: EnemyType.BOSS,
    health: 70,
    mana: 8,
    speed: 1,
    damageType: DamageType.MAGIC,
    strengthAtk: 4,
    strengthDef: 4,
    magicAtk: 2,
    magicDef: 2,
    manaRegen: 3,
    moves: ['basic_strike'],
    goldReward: { min: 40, max: 60 }
  },
  vampire: {
    id: 'vampire',
    name: 'enemies.vampire',
    imageId: 'vampire',
    tier: 3,
    type: EnemyType.MINION,
    health: 25,
    mana: 4,
    speed: 1,
    damageType: DamageType.BOTH,
    strengthAtk: 4,
    strengthDef: 4,
    magicAtk: 4,
    magicDef: 4,
    manaRegen: 1,
    moves: ['basic_strike'],
    goldReward: { min: 20, max: 30 }
  },
  vampire_count: {
    id: 'vampire_count',
    name: 'enemies.vampire_count',
    imageId: 'vampire',
    tier: 3,
    type: EnemyType.BOSS,
    health: 75,
    mana: 10,
    speed: 1,
    damageType: DamageType.BOTH,
    strengthAtk: 3,
    strengthDef: 3,
    magicAtk: 3,
    magicDef: 3,
    manaRegen: 3,
    moves: ['basic_strike'],
    goldReward: { min: 45, max: 70 }
  },
  nephilim: {
    id: 'nephilim',
    name: 'enemies.nephilim',
    imageId: 'nephilim',
    tier: 3,
    type: EnemyType.BOSS,
    health: 90,
    mana: 12,
    speed: 1,
    damageType: DamageType.MAGIC,
    strengthAtk: 4,
    strengthDef: 3,
    magicAtk: 2,
    magicDef: 2,
    manaRegen: 3,
    moves: ['basic_strike'],
    goldReward: { min: 50, max: 80 }
  },
  // Tier 4 (post-beta)
  belphegor_avatar: {
    id: 'belphegor_avatar',
    name: 'enemies.belphegor_avatar',
    imageId: 'demon_lord',
    tier: 4,
    type: EnemyType.BOSS,
    health: 150,
    mana: 15,
    speed: 1,
    damageType: DamageType.BOTH,
    strengthAtk: 2,
    strengthDef: 2,
    magicAtk: 2,
    magicDef: 2,
    manaRegen: 4,
    moves: ['basic_strike'],
    goldReward: { min: 80, max: 120 }
  },
  behemoth: {
    id: 'behemoth',
    name: 'enemies.behemoth',
    imageId: 'nephilim',
    tier: 4,
    type: EnemyType.BOSS,
    health: 200,
    mana: 0,
    speed: 1,
    damageType: DamageType.PHYSICAL,
    strengthAtk: 2,
    strengthDef: 1,
    magicAtk: 6,
    magicDef: 4,
    manaRegen: 0,
    moves: ['basic_strike'],
    goldReward: { min: 100, max: 150 }
  },
  fallen_angel: {
    id: 'fallen_angel',
    name: 'enemies.fallen_angel',
    imageId: 'nephilim',
    tier: 4,
    type: EnemyType.BOSS,
    health: 125,
    mana: 20,
    speed: 1,
    damageType: DamageType.MAGIC,
    strengthAtk: 3,
    strengthDef: 2,
    magicAtk: 1,
    magicDef: 1,
    manaRegen: 5,
    moves: ['basic_strike'],
    goldReward: { min: 90, max: 140 }
  }
}

export const getEnemy = (id: string): EnemyTemplate | undefined => {
  return ENEMIES[id]
}

export const getEnemiesByTier = (tier: number): EnemyTemplate[] => {
  return Object.values(ENEMIES).filter((e) => e.tier <= tier)
}

/**
 * Stat scaling multipliers based on tier difference
 * Applied when character tier exceeds enemy tier
 */
export const TIER_SCALING_MULTIPLIERS: Record<number, number> = {
  0: 1.0,
  1: 1.15,
  2: 1.25,
  3: 1.35
}

export function getStatScalingMultiplier(characterTier: number, enemyTier: number): number {
  const tierDiff = Math.max(0, characterTier - enemyTier)
  const cappedDiff = Math.min(tierDiff, 3)
  return TIER_SCALING_MULTIPLIERS[cappedDiff] || 1.0
}

export function applyStatScaling(template: EnemyTemplate, characterTier: number): EnemyTemplate {
  const multiplier = getStatScalingMultiplier(characterTier, template.tier)

  if (multiplier === 1.0) {
    return template
  }

  return {
    ...template,
    health: Math.ceil(template.health * multiplier),
    mana: Math.ceil(template.mana * multiplier),
    strengthDef: Math.ceil(template.strengthDef * multiplier),
    magicDef: Math.ceil(template.magicDef * multiplier),
    goldReward: {
      min: Math.ceil(template.goldReward.min * multiplier),
      max: Math.ceil(template.goldReward.max * multiplier)
    }
  }
}

export function calculateGoldReward(enemy: EnemyTemplate): number {
  const { min, max } = enemy.goldReward
  return Math.floor(Math.random() * (max - min + 1)) + min
}
