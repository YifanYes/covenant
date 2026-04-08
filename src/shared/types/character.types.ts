export interface CharacterClassType {
  id: string
  characterId: string
  className: string
  tier: number
  health: number
  mana: number
  maxHealth: number
  maxMana: number
  strengthAtk: number
  strengthDef: number
  magicAtk: number
  magicDef: number
  manaRegen: number
  morality: number
  equippedDoctrines: string[] // Array of doctrine IDs, max 2
  createdAt: Date
  updatedAt: Date
}

export interface CharacterType {
  id: string
  name: string
  title: string | null
  factionName: string
  magicNature: string | null
  currentClass: string
  data: any
  userId: string
  gold: number
  inventory: any
  loadout: any
  materials: any
  createdAt: Date
  updatedAt: Date
}

export type CharacterWithClasses = CharacterType & { classes: CharacterClassType[] }

export interface CharacterProgress {
  currentClass: CharacterClassType | undefined
  tier: number
  maxDice: number
  diceBank: number
}
