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

// Phase 2A: HP literals multiplied ×5 (calibrates Gen-1 damage formula to 3-4 turn fights at parity).
// `speed` added for Pokémon-style turn order — higher acts first; ties random.
export const CLASS_INITIAL_STATS = {
  [CharacterClassName.TEMPLAR]: {
    health: 40,
    maxHealth: 40,
    mana: 5,
    maxMana: 5,
    strengthAtk: 4,
    strengthDef: 4,
    magicAtk: 5,
    magicDef: 5,
    manaRegen: 1,
    speed: 1
  },
  [CharacterClassName.HERALD]: {
    health: 25,
    maxHealth: 25,
    mana: 11,
    maxMana: 11,
    strengthAtk: 5,
    strengthDef: 5,
    magicAtk: 4,
    magicDef: 4,
    manaRegen: 2,
    speed: 3
  },
  [CharacterClassName.INQUISITOR]: {
    health: 40,
    maxHealth: 40,
    mana: 7,
    maxMana: 7,
    strengthAtk: 5,
    strengthDef: 4,
    magicAtk: 4,
    magicDef: 5,
    manaRegen: 2,
    speed: 2
  },
  [CharacterClassName.DEMON_HUNTER]: {
    health: 30,
    maxHealth: 30,
    mana: 7,
    maxMana: 7,
    strengthAtk: 4,
    strengthDef: 5,
    magicAtk: 5,
    magicDef: 4,
    manaRegen: 1,
    speed: 3
  }
}

// Base stats (without tier bonuses). HP literals ×5 vs. pre-Phase-2A values.
// Formula: maxHealth = baseHealth + (tier * 10), maxMana = baseMana + tier
export const CLASS_BASE_STATS = {
  [CharacterClassName.TEMPLAR]: { baseHealth: 30, baseMana: 4, baseSpeed: 1 },
  [CharacterClassName.HERALD]: { baseHealth: 15, baseMana: 10, baseSpeed: 3 },
  [CharacterClassName.INQUISITOR]: { baseHealth: 30, baseMana: 6, baseSpeed: 2 },
  [CharacterClassName.DEMON_HUNTER]: { baseHealth: 20, baseMana: 6, baseSpeed: 3 }
}

export function calculateMaxStats(className: CharacterClassName, tier: number) {
  const base = CLASS_BASE_STATS[className]
  return {
    maxHealth: base.baseHealth + tier * 10,
    maxMana: base.baseMana + tier
  }
}
