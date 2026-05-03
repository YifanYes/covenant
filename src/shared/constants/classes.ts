export enum CharacterClassName {
  TEMPLAR = 'templar',
  HERALD = 'herald',
  INQUISITOR = 'inquisitor',
  DEMON_HUNTER = 'demon_hunter'
}

export enum MagicNature {
  FORM = 'form',
  VOID = 'void'
}

export const CLASS_INITIAL_STATS = {
  [CharacterClassName.TEMPLAR]: {
    health: 8,
    maxHealth: 8,
    mana: 5,
    maxMana: 5,
    strengthAtk: 4,
    strengthDef: 4,
    magicAtk: 5,
    magicDef: 5,
    manaRegen: 1
  },
  [CharacterClassName.HERALD]: {
    health: 5,
    maxHealth: 5,
    mana: 11,
    maxMana: 11,
    strengthAtk: 5,
    strengthDef: 5,
    magicAtk: 4,
    magicDef: 4,
    manaRegen: 2
  },
  [CharacterClassName.INQUISITOR]: {
    health: 8,
    maxHealth: 8,
    mana: 7,
    maxMana: 7,
    strengthAtk: 5,
    strengthDef: 4,
    magicAtk: 4,
    magicDef: 5,
    manaRegen: 2
  },
  [CharacterClassName.DEMON_HUNTER]: {
    health: 6,
    maxHealth: 6,
    mana: 7,
    maxMana: 7,
    strengthAtk: 4,
    strengthDef: 5,
    magicAtk: 5,
    magicDef: 4,
    manaRegen: 1
  }
}

// Base stats (without tier bonuses) - derived from tier 1 values
// Formula: maxHealth = baseHealth + (tier * 2), maxMana = baseMana + tier
export const CLASS_BASE_STATS = {
  [CharacterClassName.TEMPLAR]: { baseHealth: 6, baseMana: 4 },
  [CharacterClassName.HERALD]: { baseHealth: 3, baseMana: 10 },
  [CharacterClassName.INQUISITOR]: { baseHealth: 6, baseMana: 6 },
  [CharacterClassName.DEMON_HUNTER]: { baseHealth: 4, baseMana: 6 }
}

export function calculateMaxStats(className: CharacterClassName, tier: number) {
  const base = CLASS_BASE_STATS[className]
  return {
    maxHealth: base.baseHealth + tier * 2,
    maxMana: base.baseMana + tier
  }
}
