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

// Phase 2B balance pass. HP literals already ×5 per Phase 2A. Move pools and stat
// ramps tuned per archetype: MINION ≤ ELITE ≤ BOSS by HP / mana budget; physical
// enemies favor shoulder_charge / reckless_strike, magic favors plasma_missile /
// frost_bite / truth_blade, bosses get ultimates (kings_sword / stellar_collapse).
// Speed: bosses tend to act later (1), minions / casters faster (2-3).
// manaRegen is retained on the type for backward compat but unused at runtime
// (Phase 2A locked "no regen"; Reserve top-up handles refills).
export const ENEMIES: Record<string, EnemyTemplate> = {
  // ═══════════════════════════════════════
  // Tier 1
  // ═══════════════════════════════════════
  skeleton: {
    id: 'skeleton',
    name: 'enemies.skeleton',
    imageId: 'skeleton',
    tier: 1,
    type: EnemyType.MINION,
    health: 18,
    mana: 0,
    speed: 2,
    damageType: DamageType.PHYSICAL,
    strengthAtk: 5,
    strengthDef: 4,
    magicAtk: 4,
    magicDef: 4,
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
    health: 30,
    mana: 4,
    speed: 2,
    damageType: DamageType.PHYSICAL,
    strengthAtk: 6,
    strengthDef: 5,
    magicAtk: 4,
    magicDef: 4,
    manaRegen: 0,
    moves: ['shoulder_charge', 'basic_strike'],
    goldReward: { min: 15, max: 25 }
  },
  bandit_runic: {
    id: 'bandit_runic',
    name: 'enemies.bandit_runic',
    imageId: 'bandit_runic',
    tier: 1,
    type: EnemyType.MINION,
    health: 20,
    mana: 6,
    speed: 3,
    damageType: DamageType.MAGIC,
    strengthAtk: 4,
    strengthDef: 4,
    magicAtk: 5,
    magicDef: 4,
    manaRegen: 0,
    moves: ['frost_bite', 'basic_strike'],
    goldReward: { min: 10, max: 15 }
  },
  bandit_stalker: {
    id: 'bandit_stalker',
    name: 'enemies.bandit_stalker',
    imageId: 'bandit_stalker',
    tier: 1,
    type: EnemyType.MINION,
    health: 20,
    mana: 2,
    speed: 3,
    damageType: DamageType.PHYSICAL,
    strengthAtk: 5,
    strengthDef: 3,
    magicAtk: 4,
    magicDef: 3,
    manaRegen: 0,
    moves: ['shoulder_charge', 'basic_strike'],
    goldReward: { min: 10, max: 14 }
  },
  fallen_templar: {
    id: 'fallen_templar',
    name: 'enemies.fallen_templar',
    imageId: 'heretic_templar',
    tier: 1,
    type: EnemyType.MINION,
    health: 22,
    mana: 4,
    speed: 2,
    damageType: DamageType.PHYSICAL,
    strengthAtk: 5,
    strengthDef: 4,
    magicAtk: 4,
    magicDef: 4,
    manaRegen: 0,
    moves: ['shoulder_charge', 'basic_strike'],
    goldReward: { min: 10, max: 15 }
  },
  ghost: {
    id: 'ghost',
    name: 'enemies.ghost',
    imageId: 'ghost',
    tier: 1,
    type: EnemyType.MINION,
    health: 12,
    mana: 6,
    speed: 3,
    damageType: DamageType.MAGIC,
    strengthAtk: 3,
    strengthDef: 3,
    magicAtk: 5,
    magicDef: 4,
    manaRegen: 0,
    moves: ['plasma_missile', 'basic_strike'],
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
    speed: 3,
    damageType: DamageType.PHYSICAL,
    strengthAtk: 5,
    strengthDef: 4,
    magicAtk: 4,
    magicDef: 4,
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
    health: 32,
    mana: 6,
    speed: 1,
    damageType: DamageType.MAGIC,
    strengthAtk: 4,
    strengthDef: 3,
    magicAtk: 5,
    magicDef: 5,
    manaRegen: 0,
    moves: ['plasma_missile', 'basic_strike'],
    goldReward: { min: 12, max: 18 }
  },
  shadow_demon: {
    id: 'shadow_demon',
    name: 'enemies.shadow_demon',
    imageId: 'shadow_demon',
    tier: 1,
    type: EnemyType.MINION,
    health: 25,
    mana: 6,
    speed: 3,
    damageType: DamageType.MAGIC,
    strengthAtk: 4,
    strengthDef: 4,
    magicAtk: 5,
    magicDef: 4,
    manaRegen: 0,
    moves: ['plasma_missile', 'frost_bite', 'basic_strike'],
    goldReward: { min: 12, max: 18 }
  },
  // ═══════════════════════════════════════
  // Tier 2
  // ═══════════════════════════════════════
  fallen_inquisitor: {
    id: 'fallen_inquisitor',
    name: 'enemies.fallen_inquisitor',
    imageId: 'heretic_templar',
    tier: 2,
    type: EnemyType.MINION,
    health: 32,
    mana: 6,
    speed: 2,
    damageType: DamageType.MAGIC,
    strengthAtk: 5,
    strengthDef: 4,
    magicAtk: 6,
    magicDef: 5,
    manaRegen: 0,
    moves: ['truth_blade', 'plasma_missile', 'basic_strike'],
    goldReward: { min: 15, max: 22 }
  },
  armored_templar: {
    id: 'armored_templar',
    name: 'enemies.armored_templar',
    imageId: 'heretic_templar',
    tier: 2,
    type: EnemyType.ELITE,
    health: 45,
    mana: 5,
    speed: 1,
    damageType: DamageType.PHYSICAL,
    strengthAtk: 6,
    strengthDef: 6,
    magicAtk: 4,
    magicDef: 5,
    manaRegen: 0,
    moves: ['light_shield', 'shoulder_charge', 'basic_strike'],
    goldReward: { min: 20, max: 30 }
  },
  werewolf: {
    id: 'werewolf',
    name: 'enemies.werewolf',
    imageId: 'young_werewolf',
    tier: 2,
    type: EnemyType.MINION,
    health: 35,
    mana: 2,
    speed: 3,
    damageType: DamageType.PHYSICAL,
    strengthAtk: 6,
    strengthDef: 4,
    magicAtk: 4,
    magicDef: 4,
    manaRegen: 0,
    moves: ['shoulder_charge', 'basic_strike'],
    goldReward: { min: 15, max: 22 }
  },
  werewolf_alpha: {
    id: 'werewolf_alpha',
    name: 'enemies.werewolf_alpha',
    imageId: 'alpha_werewolf',
    tier: 2,
    type: EnemyType.BOSS,
    health: 70,
    mana: 6,
    speed: 2,
    damageType: DamageType.PHYSICAL,
    strengthAtk: 7,
    strengthDef: 5,
    magicAtk: 5,
    magicDef: 4,
    manaRegen: 0,
    moves: ['reckless_strike', 'shoulder_charge', 'basic_strike'],
    goldReward: { min: 35, max: 50 }
  },
  // ═══════════════════════════════════════
  // Tier 3
  // ═══════════════════════════════════════
  elite_armored_templar: {
    id: 'elite_armored_templar',
    name: 'enemies.elite_armored_templar',
    imageId: 'heretic_templar',
    tier: 3,
    type: EnemyType.BOSS,
    health: 90,
    mana: 10,
    speed: 1,
    damageType: DamageType.PHYSICAL,
    strengthAtk: 7,
    strengthDef: 7,
    magicAtk: 5,
    magicDef: 6,
    manaRegen: 0,
    moves: ['kings_sword', 'light_shield', 'shoulder_charge', 'basic_strike'],
    goldReward: { min: 40, max: 60 }
  },
  shadow_demon_elite: {
    id: 'shadow_demon_elite',
    name: 'enemies.shadow_demon_elite',
    imageId: 'shadow_demon',
    tier: 3,
    type: EnemyType.MINION,
    health: 35,
    mana: 8,
    speed: 3,
    damageType: DamageType.MAGIC,
    strengthAtk: 5,
    strengthDef: 4,
    magicAtk: 6,
    magicDef: 5,
    manaRegen: 0,
    moves: ['plasma_missile', 'ice_lance', 'frost_bite', 'basic_strike'],
    goldReward: { min: 18, max: 28 }
  },
  minor_demon: {
    id: 'minor_demon',
    name: 'enemies.minor_demon',
    imageId: 'shadow_demon',
    tier: 3,
    type: EnemyType.MINION,
    health: 30,
    mana: 4,
    speed: 2,
    damageType: DamageType.MAGIC,
    strengthAtk: 5,
    strengthDef: 5,
    magicAtk: 5,
    magicDef: 5,
    manaRegen: 0,
    moves: ['plasma_missile', 'basic_strike'],
    goldReward: { min: 18, max: 25 }
  },
  elite_demon: {
    id: 'elite_demon',
    name: 'enemies.elite_demon',
    imageId: 'elite_demon',
    tier: 3,
    type: EnemyType.ELITE,
    health: 55,
    mana: 9,
    speed: 2,
    damageType: DamageType.MAGIC,
    strengthAtk: 6,
    strengthDef: 5,
    magicAtk: 6,
    magicDef: 5,
    manaRegen: 0,
    moves: ['ice_lance', 'plasma_missile', 'frost_bite', 'basic_strike'],
    goldReward: { min: 25, max: 40 }
  },
  demon_lord: {
    id: 'demon_lord',
    name: 'enemies.demon_lord',
    imageId: 'demon_lord',
    tier: 3,
    type: EnemyType.BOSS,
    health: 100,
    mana: 14,
    speed: 1,
    damageType: DamageType.BOTH,
    strengthAtk: 6,
    strengthDef: 6,
    magicAtk: 6,
    magicDef: 6,
    manaRegen: 0,
    moves: ['stellar_collapse', 'plasma_missile', 'frost_bite', 'basic_strike'],
    goldReward: { min: 45, max: 70 }
  },
  fallen_inquisitor_boss: {
    id: 'fallen_inquisitor_boss',
    name: 'enemies.fallen_inquisitor_boss',
    imageId: 'heretic_templar',
    tier: 3,
    type: EnemyType.BOSS,
    health: 85,
    mana: 12,
    speed: 2,
    damageType: DamageType.MAGIC,
    strengthAtk: 5,
    strengthDef: 5,
    magicAtk: 7,
    magicDef: 6,
    manaRegen: 0,
    moves: ['plasma_missile', 'truth_blade', 'basic_strike'],
    goldReward: { min: 40, max: 60 }
  },
  vampire: {
    id: 'vampire',
    name: 'enemies.vampire',
    imageId: 'vampire',
    tier: 3,
    type: EnemyType.MINION,
    health: 35,
    mana: 6,
    speed: 3,
    damageType: DamageType.BOTH,
    strengthAtk: 5,
    strengthDef: 5,
    magicAtk: 5,
    magicDef: 5,
    manaRegen: 0,
    moves: ['shoulder_charge', 'plasma_missile', 'basic_strike'],
    goldReward: { min: 20, max: 30 }
  },
  vampire_count: {
    id: 'vampire_count',
    name: 'enemies.vampire_count',
    imageId: 'vampire',
    tier: 3,
    type: EnemyType.BOSS,
    health: 90,
    mana: 13,
    speed: 2,
    damageType: DamageType.BOTH,
    strengthAtk: 6,
    strengthDef: 6,
    magicAtk: 6,
    magicDef: 6,
    manaRegen: 0,
    moves: ['stellar_collapse', 'plasma_missile', 'shoulder_charge', 'basic_strike'],
    goldReward: { min: 45, max: 70 }
  },
  nephilim: {
    id: 'nephilim',
    name: 'enemies.nephilim',
    imageId: 'nephilim',
    tier: 3,
    type: EnemyType.BOSS,
    health: 110,
    mana: 15,
    speed: 2,
    damageType: DamageType.MAGIC,
    strengthAtk: 5,
    strengthDef: 5,
    magicAtk: 8,
    magicDef: 6,
    manaRegen: 0,
    moves: ['stellar_collapse', 'plasma_missile', 'frost_bite', 'basic_strike'],
    goldReward: { min: 50, max: 80 }
  },
  // ═══════════════════════════════════════
  // Tier 4 (post-beta) — placeholder pools.
  // ═══════════════════════════════════════
  belphegor_avatar: {
    id: 'belphegor_avatar',
    name: 'enemies.belphegor_avatar',
    imageId: 'demon_lord',
    tier: 4,
    type: EnemyType.BOSS,
    health: 150,
    mana: 18,
    speed: 1,
    damageType: DamageType.BOTH,
    strengthAtk: 7,
    strengthDef: 7,
    magicAtk: 7,
    magicDef: 7,
    manaRegen: 0,
    moves: ['stellar_collapse', 'plasma_missile', 'frost_bite', 'basic_strike'],
    goldReward: { min: 80, max: 120 }
  },
  behemoth: {
    id: 'behemoth',
    name: 'enemies.behemoth',
    imageId: 'nephilim',
    tier: 4,
    type: EnemyType.BOSS,
    health: 200,
    mana: 10,
    speed: 1,
    damageType: DamageType.PHYSICAL,
    strengthAtk: 9,
    strengthDef: 8,
    magicAtk: 5,
    magicDef: 5,
    manaRegen: 0,
    moves: ['kings_sword', 'reckless_strike', 'shoulder_charge', 'basic_strike'],
    goldReward: { min: 100, max: 150 }
  },
  fallen_angel: {
    id: 'fallen_angel',
    name: 'enemies.fallen_angel',
    imageId: 'nephilim',
    tier: 4,
    type: EnemyType.BOSS,
    health: 130,
    mana: 20,
    speed: 2,
    damageType: DamageType.MAGIC,
    strengthAtk: 6,
    strengthDef: 6,
    magicAtk: 9,
    magicDef: 8,
    manaRegen: 0,
    moves: ['stellar_collapse', 'plasma_missile', 'ice_lance', 'basic_strike'],
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
