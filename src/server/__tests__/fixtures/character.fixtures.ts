import { CharacterClassName } from '@/shared/constants/classes.constants'
import { ALL_ITEMS, CONSUMABLES } from '@/shared/constants/items.constants'
import { ItemRarity, ItemType } from '@shared/types/gamification.types'

export interface BuildCharacterOpts {
  id?: string
  userId?: string
  mana?: number
  maxMana?: number
  reserve?: number
  health?: number
  maxHealth?: number
  className?: CharacterClassName
  classId?: string
  onboardingProgress?: Record<string, unknown> | null
  data?: Record<string, unknown>
  inventory?: unknown[]
  loadout?: unknown[]
  gold?: number
}

/**
 * Builder for character with flat mana/class opts. Use when the test cares about
 * mana/maxMana/reserve and not the full nested shape. For full overrides use `mockCharacter`.
 */
export const buildCharacter = (opts: BuildCharacterOpts = {}) => {
  const className = opts.className ?? CharacterClassName.TEMPLAR
  return {
    id: opts.id ?? 'char-123',
    userId: opts.userId ?? 'user-123',
    name: 'Test Character',
    gold: opts.gold ?? 100,
    manaReserve: opts.reserve ?? 0,
    currentClass: className,
    onboardingProgress: opts.onboardingProgress ?? null,
    data: opts.data ?? { equippedAbilities: [] },
    classes: [
      {
        id: opts.classId ?? 'class-1',
        className,
        tier: 1,
        health: opts.health ?? 100,
        maxHealth: opts.maxHealth ?? 100,
        mana: opts.mana ?? 0,
        maxMana: opts.maxMana ?? 10,
        strengthAtk: 5,
        strengthDef: 5,
        magicAtk: 5,
        magicDef: 5,
        manaRegen: 1,
        speed: 1,
        equippedAbilities: []
      }
    ],
    inventory: opts.inventory ?? [],
    loadout: opts.loadout ?? []
  }
}

export const mockCharacter = (overrides = {}) => ({
  id: 'char-123',
  userId: 'user-123',
  name: 'Test Character',
  gold: 100,
  manaReserve: 0,
  currentClass: CharacterClassName.TEMPLAR,
  data: {
    equippedAbilities: []
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
      equippedAbilities: []
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
