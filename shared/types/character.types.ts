export interface CharacterClassType {
  id: string
  characterId: string
  className: string
  tier: number
  missionProgress: any
  health: number
  mana: number
  maxHealth: number
  maxMana: number
  strengthAtk: number
  strengthDef: number
  magicAtk: number
  magicDef: number
  manaRegen: number
  createdAt: Date
  updatedAt: Date
}

export interface CharacterType {
  id: string
  name: string
  title: string | null
  orderName: string | null
  magicNature: string | null
  currentClass: string
  data: any
  userId: string
  gold: number
  inventory: any
  loadout: any
  createdAt: Date
  updatedAt: Date
}

export type CharacterWithClasses = CharacterType & { classes: CharacterClassType[] }

export interface CharacterProgress {
  currentClass: CharacterClassType | undefined
  tier: number
  missionProgress: Record<string, number>
  maxDice: number
  diceBank: number
}
