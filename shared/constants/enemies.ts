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
  imageId: string // imagege asset ID (allows variants to share images)
  tier: number
  type: EnemyType
  health: number
  mana: number
  damageType: DamageType
  strengthAtk: number
  strengthDef: number
  magicAtk: number
  magicDef: number
  manaRegen: number
  xpReward: number
  goldReward: number
}

export const ENEMIES: Record<string, EnemyTemplate> = {
  // Tier 1
  skeleton: {
    id: 'skeleton',
    name: 'enemies.skeleton',
    imageId: 'skeleton',
    tier: 1,
    type: EnemyType.MINION,
    health: 3,
    mana: 0,
    damageType: DamageType.PHYSICAL,
    strengthAtk: 5,
    strengthDef: 5,
    magicAtk: 6,
    magicDef: 6,
    manaRegen: 0,
    xpReward: 10,
    goldReward: 5
  },
  bandit_chief: {
    id: 'bandit_chief',
    name: 'enemies.bandit_chief',
    imageId: 'bandit_chief',
    tier: 1,
    type: EnemyType.ELITE,
    health: 5,
    mana: 0,
    damageType: DamageType.PHYSICAL,
    strengthAtk: 4,
    strengthDef: 4,
    magicAtk: 6,
    magicDef: 5,
    manaRegen: 0,
    xpReward: 25,
    goldReward: 15
  },
  bandit_runic: {
    id: 'bandit_runic',
    name: 'enemies.bandit_runic',
    imageId: 'bandit_chief',
    tier: 1,
    type: EnemyType.MINION,
    health: 4,
    mana: 3,
    damageType: DamageType.MAGIC,
    strengthAtk: 5,
    strengthDef: 5,
    magicAtk: 4,
    magicDef: 3,
    manaRegen: 1,
    xpReward: 15,
    goldReward: 10
  },
  bandit_stalker: {
    id: 'bandit_stalker',
    name: 'enemies.bandit_stalker',
    imageId: 'bandit_chief',
    tier: 1,
    type: EnemyType.MINION,
    health: 4,
    mana: 0,
    damageType: DamageType.PHYSICAL,
    strengthAtk: 4,
    strengthDef: 3,
    magicAtk: 6,
    magicDef: 5,
    manaRegen: 0,
    xpReward: 15,
    goldReward: 10
  },
  fallen_templar: {
    id: 'fallen_templar',
    name: 'enemies.fallen_templar',
    imageId: 'heretic_templar',
    tier: 1,
    type: EnemyType.MINION,
    health: 4,
    mana: 2,
    damageType: DamageType.PHYSICAL,
    strengthAtk: 4,
    strengthDef: 4,
    magicAtk: 5,
    magicDef: 5,
    manaRegen: 1,
    xpReward: 15,
    goldReward: 10
  },
  ghost: {
    id: 'ghost',
    name: 'enemies.ghost',
    imageId: 'ghost',
    tier: 1,
    type: EnemyType.MINION,
    health: 2,
    mana: 3,
    damageType: DamageType.MAGIC,
    strengthAtk: 6,
    strengthDef: 6,
    magicAtk: 4,
    magicDef: 4,
    manaRegen: 1,
    xpReward: 12,
    goldReward: 8
  },
  giant_spider: {
    id: 'giant_spider',
    name: 'enemies.giant_spider',
    imageId: 'spider',
    tier: 1,
    type: EnemyType.MINION,
    health: 4,
    mana: 0,
    damageType: DamageType.PHYSICAL,
    strengthAtk: 4,
    strengthDef: 5,
    magicAtk: 6,
    magicDef: 6,
    manaRegen: 0,
    xpReward: 12,
    goldReward: 8
  },

  // Tier 2
  fallen_inquisitor: {
    id: 'fallen_inquisitor',
    name: 'enemies.fallen_inquisitor',
    imageId: 'heretic_templar',
    tier: 2,
    type: EnemyType.MINION,
    health: 5,
    mana: 4,
    damageType: DamageType.MAGIC,
    strengthAtk: 5,
    strengthDef: 5,
    magicAtk: 4,
    magicDef: 3,
    manaRegen: 2,
    xpReward: 25,
    goldReward: 15
  },
  shadow_demon: {
    id: 'shadow_demon',
    name: 'enemies.shadow_demon',
    imageId: 'minor_demon',
    tier: 2,
    type: EnemyType.ELITE,
    health: 6,
    mana: 5,
    damageType: DamageType.MAGIC,
    strengthAtk: 5,
    strengthDef: 4,
    magicAtk: 3,
    magicDef: 3,
    manaRegen: 2,
    xpReward: 40,
    goldReward: 25
  },
  armored_templar: {
    id: 'armored_templar',
    name: 'enemies.armored_templar',
    imageId: 'heretic_templar',
    tier: 2,
    type: EnemyType.ELITE,
    health: 7,
    mana: 2,
    damageType: DamageType.PHYSICAL,
    strengthAtk: 4,
    strengthDef: 2,
    magicAtk: 6,
    magicDef: 5,
    manaRegen: 1,
    xpReward: 45,
    goldReward: 30
  },
  werewolf: {
    id: 'werewolf',
    name: 'enemies.werewolf',
    imageId: 'young_werewolf',
    tier: 2,
    type: EnemyType.MINION,
    health: 6,
    mana: 0,
    damageType: DamageType.PHYSICAL,
    strengthAtk: 4,
    strengthDef: 3,
    magicAtk: 6,
    magicDef: 5,
    manaRegen: 0,
    xpReward: 30,
    goldReward: 18
  },
  werewolf_alpha: {
    id: 'werewolf_alpha',
    name: 'enemies.werewolf_alpha',
    imageId: 'alpha_werewolf',
    tier: 2,
    type: EnemyType.BOSS,
    health: 12,
    mana: 0,
    damageType: DamageType.PHYSICAL,
    strengthAtk: 3,
    strengthDef: 2,
    magicAtk: 5,
    magicDef: 4,
    manaRegen: 0,
    xpReward: 120,
    goldReward: 60
  },
  // Tier 3 Enemies
  elite_armored_templar: {
    id: 'elite_armored_templar',
    name: 'enemies.elite_armored_templar',
    imageId: 'heretic_templar',
    tier: 3,
    type: EnemyType.BOSS,
    health: 14,
    mana: 4,
    damageType: DamageType.PHYSICAL,
    strengthAtk: 3,
    strengthDef: 2,
    magicAtk: 5,
    magicDef: 4,
    manaRegen: 1,
    xpReward: 180,
    goldReward: 90
  },
  magma_demon: {
    id: 'magma_demon',
    name: 'enemies.magma_demon',
    imageId: 'elite_demon',
    tier: 3,
    type: EnemyType.ELITE,
    health: 8,
    mana: 4,
    damageType: DamageType.MAGIC,
    strengthAtk: 4,
    strengthDef: 2,
    magicAtk: 4,
    magicDef: 5,
    manaRegen: 1,
    xpReward: 60,
    goldReward: 35
  },
  shadow_demon_elite: {
    id: 'shadow_demon_elite',
    name: 'enemies.shadow_demon_elite',
    imageId: 'minor_demon',
    tier: 3,
    type: EnemyType.MINION,
    health: 5,
    mana: 5,
    damageType: DamageType.MAGIC,
    strengthAtk: 5,
    strengthDef: 4,
    magicAtk: 3,
    magicDef: 3,
    manaRegen: 2,
    xpReward: 35,
    goldReward: 22
  },
  minor_demon: {
    id: 'minor_demon',
    name: 'enemies.minor_demon',
    imageId: 'minor_demon',
    tier: 3,
    type: EnemyType.MINION,
    health: 4,
    mana: 3,
    damageType: DamageType.MAGIC,
    strengthAtk: 5,
    strengthDef: 5,
    magicAtk: 4,
    magicDef: 4,
    manaRegen: 1,
    xpReward: 28,
    goldReward: 16
  },
  elite_demon: {
    id: 'elite_demon',
    name: 'enemies.elite_demon',
    imageId: 'elite_demon',
    tier: 3,
    type: EnemyType.ELITE,
    health: 9,
    mana: 6,
    damageType: DamageType.MAGIC,
    strengthAtk: 4,
    strengthDef: 3,
    magicAtk: 3,
    magicDef: 3,
    manaRegen: 2,
    xpReward: 70,
    goldReward: 40
  },
  demon_lord: {
    id: 'demon_lord',
    name: 'enemies.demon_lord',
    imageId: 'demon_lord',
    tier: 3,
    type: EnemyType.BOSS,
    health: 16,
    mana: 10,
    damageType: DamageType.BOTH,
    strengthAtk: 3,
    strengthDef: 3,
    magicAtk: 3,
    magicDef: 3,
    manaRegen: 3,
    xpReward: 220,
    goldReward: 110
  },
  fallen_inquisitor_boss: {
    id: 'fallen_inquisitor_boss',
    name: 'enemies.fallen_inquisitor_boss',
    imageId: 'heretic_templar',
    tier: 3,
    type: EnemyType.BOSS,
    health: 14,
    mana: 8,
    damageType: DamageType.MAGIC,
    strengthAtk: 4,
    strengthDef: 4,
    magicAtk: 2,
    magicDef: 2,
    manaRegen: 3,
    xpReward: 200,
    goldReward: 100
  },
  vampire: {
    id: 'vampire',
    name: 'enemies.vampire',
    imageId: 'vampire',
    tier: 3,
    type: EnemyType.MINION,
    health: 5,
    mana: 4,
    damageType: DamageType.BOTH,
    strengthAtk: 4,
    strengthDef: 4,
    magicAtk: 4,
    magicDef: 4,
    manaRegen: 1,
    xpReward: 35,
    goldReward: 22
  },
  vampire_count: {
    id: 'vampire_count',
    name: 'enemies.vampire_count',
    imageId: 'vampire',
    tier: 3,
    type: EnemyType.BOSS,
    health: 15,
    mana: 10,
    damageType: DamageType.BOTH,
    strengthAtk: 3,
    strengthDef: 3,
    magicAtk: 3,
    magicDef: 3,
    manaRegen: 3,
    xpReward: 200,
    goldReward: 100
  },
  nephilim: {
    id: 'nephilim',
    name: 'enemies.nephilim',
    imageId: 'nephilim',
    tier: 3,
    type: EnemyType.BOSS,
    health: 18,
    mana: 12,
    damageType: DamageType.MAGIC,
    strengthAtk: 4,
    strengthDef: 3,
    magicAtk: 2,
    magicDef: 2,
    manaRegen: 3,
    xpReward: 250,
    goldReward: 120
  },
  // Tier 4
  belphegor_avatar: {
    id: 'belphegor_avatar',
    name: 'enemies.belphegor_avatar',
    imageId: 'demon_lord',
    tier: 4,
    type: EnemyType.BOSS,
    health: 30,
    mana: 15,
    damageType: DamageType.BOTH,
    strengthAtk: 2,
    strengthDef: 2,
    magicAtk: 2,
    magicDef: 2,
    manaRegen: 4,
    xpReward: 500,
    goldReward: 200
  },
  behemoth: {
    id: 'behemoth',
    name: 'enemies.behemoth',
    imageId: 'nephilim',
    tier: 4,
    type: EnemyType.BOSS,
    health: 40,
    mana: 0,
    damageType: DamageType.PHYSICAL,
    strengthAtk: 2,
    strengthDef: 1,
    magicAtk: 6,
    magicDef: 4,
    manaRegen: 0,
    xpReward: 600,
    goldReward: 200
  },
  fallen_angel: {
    id: 'fallen_angel',
    name: 'enemies.fallen_angel',
    imageId: 'nephilim',
    tier: 4,
    type: EnemyType.BOSS,
    health: 25,
    mana: 20,
    damageType: DamageType.MAGIC,
    strengthAtk: 3,
    strengthDef: 2,
    magicAtk: 1,
    magicDef: 1,
    manaRegen: 5,
    xpReward: 750,
    goldReward: 200
  }
}

export const getEnemy = (id: string): EnemyTemplate | undefined => {
  return ENEMIES[id]
}

export const getEnemiesByTier = (tier: number): EnemyTemplate[] => {
  return Object.values(ENEMIES).filter((e) => e.tier <= tier)
}
