export enum CharacterClassName {
  TEMPLAR = 'templar',
  HERALD = 'herald',
  INQUISITOR = 'inquisitor',
  DEMON_HUNTER = 'demon_hunter'
}

export const CLASS_INITIAL_STATS = {
  [CharacterClassName.TEMPLAR]: {
    health: 8,
    mana: 5,
    strengthAtk: 4,
    strengthDef: 4,
    magicAtk: 5,
    magicDef: 5,
    manaRegen: 1
  },
  [CharacterClassName.HERALD]: {
    health: 5,
    mana: 11,
    strengthAtk: 5,
    strengthDef: 5,
    magicAtk: 4,
    magicDef: 4,
    manaRegen: 2
  },
  [CharacterClassName.INQUISITOR]: {
    health: 8,
    mana: 7,
    strengthAtk: 5,
    strengthDef: 4,
    magicAtk: 4,
    magicDef: 5,
    manaRegen: 2
  },
  [CharacterClassName.DEMON_HUNTER]: {
    health: 6,
    mana: 7,
    strengthAtk: 4,
    strengthDef: 5,
    magicAtk: 5,
    magicDef: 4,
    manaRegen: 1
  }
}
