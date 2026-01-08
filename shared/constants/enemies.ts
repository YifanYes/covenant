export type DamageType = 'PHYSICAL' | 'MAGIC' | 'BOTH'
export type EnemyType = 'MINION' | 'ELITE' | 'BOSS'

export interface EnemyTemplate {
  id: string
  name: string
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
  // Tier 1 Enemies
  skeleton: {
    id: 'skeleton',
    name: 'enemies.skeleton',
    tier: 1,
    type: 'MINION',
    health: 3,
    mana: 0,
    damageType: 'PHYSICAL',
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
    tier: 1,
    type: 'ELITE',
    health: 5,
    mana: 0,
    damageType: 'PHYSICAL',
    strengthAtk: 4,
    strengthDef: 4,
    magicAtk: 6,
    magicDef: 5,
    manaRegen: 0,
    xpReward: 25,
    goldReward: 15
  },
  heretic_templar: {
    id: 'heretic_templar',
    name: 'enemies.heretic_templar',
    tier: 1,
    type: 'MINION',
    health: 4,
    mana: 2,
    damageType: 'PHYSICAL',
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
    tier: 1,
    type: 'MINION',
    health: 2,
    mana: 3,
    damageType: 'MAGIC',
    strengthAtk: 6,
    strengthDef: 6,
    magicAtk: 4,
    magicDef: 4,
    manaRegen: 1,
    xpReward: 12,
    goldReward: 8
  },
  skeleton_warrior_elite: {
    id: 'skeleton_warrior_elite',
    name: 'enemies.skeleton_warrior_elite',
    tier: 1,
    type: 'ELITE',
    health: 6,
    mana: 0,
    damageType: 'PHYSICAL',
    strengthAtk: 4,
    strengthDef: 3,
    magicAtk: 6,
    magicDef: 5,
    manaRegen: 0,
    xpReward: 30,
    goldReward: 20
  },

  // Tier 2 Enemies
  heretic_cultist: {
    id: 'heretic_cultist',
    name: 'enemies.heretic_cultist',
    tier: 2,
    type: 'MINION',
    health: 3,
    mana: 5,
    damageType: 'MAGIC',
    strengthAtk: 5,
    strengthDef: 5,
    magicAtk: 4,
    magicDef: 4,
    manaRegen: 2,
    xpReward: 20,
    goldReward: 12
  },
  young_werewolf: {
    id: 'young_werewolf',
    name: 'enemies.young_werewolf',
    tier: 2,
    type: 'MINION',
    health: 5,
    mana: 0,
    damageType: 'PHYSICAL',
    strengthAtk: 4,
    strengthDef: 4,
    magicAtk: 6,
    magicDef: 5,
    manaRegen: 0,
    xpReward: 25,
    goldReward: 15
  },
  alpha_werewolf: {
    id: 'alpha_werewolf',
    name: 'enemies.alpha_werewolf',
    tier: 2,
    type: 'BOSS',
    health: 10,
    mana: 0,
    damageType: 'PHYSICAL',
    strengthAtk: 3,
    strengthDef: 3,
    magicAtk: 5,
    magicDef: 4,
    manaRegen: 0,
    xpReward: 100,
    goldReward: 50
  },
  elite_bandit: {
    id: 'elite_bandit',
    name: 'enemies.elite_bandit',
    tier: 2,
    type: 'MINION',
    health: 4,
    mana: 0,
    damageType: 'PHYSICAL',
    strengthAtk: 4,
    strengthDef: 4,
    magicAtk: 6,
    magicDef: 5,
    manaRegen: 0,
    xpReward: 20,
    goldReward: 15
  },
  tank_heretic_templar: {
    id: 'tank_heretic_templar',
    name: 'enemies.tank_heretic_templar',
    tier: 2,
    type: 'ELITE',
    health: 8,
    mana: 3,
    damageType: 'PHYSICAL',
    strengthAtk: 4,
    strengthDef: 2,
    magicAtk: 5,
    magicDef: 4,
    manaRegen: 1,
    xpReward: 60,
    goldReward: 40
  },

  // Tier 3 Enemies
  vampire_chief: {
    id: 'vampire_chief',
    name: 'enemies.vampire_chief',
    tier: 3,
    type: 'BOSS',
    health: 12,
    mana: 8,
    damageType: 'BOTH',
    strengthAtk: 3,
    strengthDef: 3,
    magicAtk: 3,
    magicDef: 3,
    manaRegen: 2,
    xpReward: 150,
    goldReward: 80
  },
  minor_vampire: {
    id: 'minor_vampire',
    name: 'enemies.minor_vampire',
    tier: 3,
    type: 'MINION',
    health: 4,
    mana: 4,
    damageType: 'BOTH',
    strengthAtk: 4,
    strengthDef: 4,
    magicAtk: 4,
    magicDef: 4,
    manaRegen: 1,
    xpReward: 30,
    goldReward: 20
  },
  herald_vampire: {
    id: 'herald_vampire',
    name: 'enemies.herald_vampire',
    tier: 3,
    type: 'BOSS',
    health: 15,
    mana: 10,
    damageType: 'BOTH',
    strengthAtk: 3,
    strengthDef: 2,
    magicAtk: 2,
    magicDef: 3,
    manaRegen: 3,
    xpReward: 200,
    goldReward: 100
  },
  minor_demon: {
    id: 'minor_demon',
    name: 'enemies.minor_demon',
    tier: 3,
    type: 'MINION',
    health: 3,
    mana: 3,
    damageType: 'MAGIC',
    strengthAtk: 5,
    strengthDef: 5,
    magicAtk: 3,
    magicDef: 4,
    manaRegen: 1,
    xpReward: 25,
    goldReward: 15
  },
  minor_nephilim: {
    id: 'minor_nephilim',
    name: 'enemies.minor_nephilim',
    tier: 3,
    type: 'BOSS',
    health: 18,
    mana: 12,
    damageType: 'MAGIC',
    strengthAtk: 4,
    strengthDef: 3,
    magicAtk: 2,
    magicDef: 2,
    manaRegen: 3,
    xpReward: 250,
    goldReward: 120
  }
}

export const getEnemy = (id: string): EnemyTemplate | undefined => {
  return ENEMIES[id]
}

export const getEnemiesByTier = (tier: number): EnemyTemplate[] => {
  return Object.values(ENEMIES).filter((e) => e.tier <= tier)
}
