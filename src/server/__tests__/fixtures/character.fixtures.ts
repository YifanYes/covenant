import { CharacterClassName } from '@shared/constants/classes'
import { ALL_ITEMS, CONSUMABLES } from '@shared/constants/items'
import { ItemRarity, ItemType } from '@shared/types/gamification.types'

export const mockCharacter = (overrides = {}) => ({
  id: 'char-123',
  userId: 'user-123',
  name: 'Test Character',
  gold: 100,
  manaReserve: 0,
  currentClass: CharacterClassName.TEMPLAR,
  data: {
    equippedDoctrines: []
  },
  classes: [
    {
      id: 'class-1',
      className: CharacterClassName.TEMPLAR,
      tier: 1,
      health: 100,
      maxHealth: 100,
      mana: 50,
      maxMana: 50,
      strengthAtk: 5,
      strengthDef: 5,
      magicAtk: 5,
      magicDef: 5,
      manaRegen: 1,
      speed: 1,
      equippedDoctrines: []
    }
  ],
  inventory: [],
  loadout: [],
  ...overrides
})

export const mockInventoryItem = (definitionId: string, overrides = {}) => {
  const definition = ALL_ITEMS[definitionId] || CONSUMABLES[definitionId]
  if (!definition) throw new Error(`Item ${definitionId} not found`)

  return {
    id: `item-${Math.random().toString(36).substr(2, 9)}`,
    definitionId,
    type: definition.type || ItemType.WEAPON_MELEE,
    rarity: ItemRarity.COMMON,
    stats: definition.stats || {},
    ...overrides
  }
}
