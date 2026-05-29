export interface CharacterClassType {
  id: bigint
  characterId: bigint
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
  speed: number
  equippedAbilities: string[] // Array of ability IDs, max 2
  createdAt: Date
  updatedAt: Date
}

export interface CharacterType {
  id: bigint
  slug: string
  name: string
  title: string | null
  factionName: string
  magicNature: string | null
  currentClass: string
  data: any
  userId: string
  gold: number
  manaReserve: number
  inventory: any
  loadout: any
  createdAt: Date
  updatedAt: Date
}

export type CharacterWithClasses = CharacterType & {
  classes: CharacterClassType[]
  onboardingProgress?: unknown
  user?: { tutorialSlidesSeen: unknown }
}

export interface CharacterProgress {
  currentClass: CharacterClassType | undefined
  tier: number
  manaReserve: number
}
