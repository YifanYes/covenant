import type { CharacterClassName, MagicNature } from '@shared/constants/classes'
import { getAvailableAbilities, getAbilityById, MAX_EQUIPPED_ABILITIES } from '@shared/constants/abilities'
import { createInventoryItem, TIER_1_ITEMS } from '@shared/constants/items'
import type { CreateCharacterType } from '@shared/schemas/character.schemas'
import type { CharacterWithClasses } from '@shared/types/character.types'
import type { AbilityDefinition } from '@shared/types/ability.types'
import { ItemType, type InventoryItem } from '@shared/types/gamification.types'
import { TRPCError } from '@trpc/server'
import type { CharacterRepository } from '../repositories/character.repository'
import type { UserRepository } from '../repositories/user.repository'
import { getCharacterProgress } from '../utils/character.utils'
import type { ManaService } from './mana.service'

export class CharacterService {
  constructor(
    private characterRepository: CharacterRepository,
    private userRepository: UserRepository,
    private manaService?: ManaService
  ) {}

  getCharacterProgress(character: CharacterWithClasses) {
    return getCharacterProgress(character)
  }

  async createCharacter(userId: string, input: CreateCharacterType) {
    const character = await this.characterRepository.create(userId, input)
    await this.characterRepository.createAreas(userId)

    return character
  }

  async getCharacterById(characterId: string, userId?: string) {
    return this.characterRepository.findByIdWithClassesOrThrow(characterId, userId)
  }

  async verifyCharacterOwnership(characterId: string, userId: string): Promise<boolean> {
    return this.characterRepository.verifyOwnership(characterId, userId)
  }

  async getCurrentClass(userId: string) {
    let character = await this.characterRepository.findWithClasses(userId)
    if (!character) return null

    // One-time backfill for pre-Phase-2A characters. Flag check first so the hot path is a no-op.
    if (this.manaService && (character.data as { scrubbedManaPotions?: boolean })?.scrubbedManaPotions !== true) {
      await this.manaService.scrubManaPotions(userId)
      character = (await this.characterRepository.findWithClasses(userId)) ?? character
    }

    const { tier } = getCharacterProgress(character)

    return {
      id: character.id,
      name: character.name,
      title: character.title,
      factionName: character.factionName,
      magicNature: character.magicNature,
      currentClass: character.currentClass,
      data: character.data as any,
      gold: character.gold,
      manaReserve: character.manaReserve ?? 0,
      tier,
      inventory: character.inventory as unknown,
      loadout: character.loadout as unknown,
      tutorialCompletedAt: character.user?.tutorialCompletedAt ?? null,
      classes: character.classes.map((c) => ({
        id: c.id,
        className: c.className,
        tier: c.tier,
        health: c.health,
        mana: c.mana,
        maxHealth: c.maxHealth,
        maxMana: c.maxMana,
        strengthAtk: c.strengthAtk,
        strengthDef: c.strengthDef,
        magicAtk: c.magicAtk,
        magicDef: c.magicDef,
        manaRegen: c.manaRegen,
        speed: (c as { speed?: number }).speed ?? 1,
        equippedAbilities: (c as { equippedAbilities?: string[] }).equippedAbilities || []
      }))
    }
  }

  async updateName(userId: string, name: string) {
    return this.characterRepository.updateName(userId, name)
  }

  async completeTutorial(userId: string) {
    return this.userRepository.setTutorialCompletedAt(userId, new Date())
  }

  async resetTutorial(userId: string) {
    return this.userRepository.setTutorialCompletedAt(userId, null)
  }

  async switchClass(userId: string, className: string) {
    const character = await this.characterRepository.findWithClassesOrThrow(userId)

    let characterClass = character.classes.find((c) => c.className === className)

    if (!characterClass) {
      characterClass = await this.characterRepository.createClass(character.id, className)
    }

    const updatedCharacter = await this.characterRepository.updateCurrentClass(character.id, className)

    return updatedCharacter
  }

  async equipItem(userId: string, itemId: string): Promise<{ success: boolean }> {
    const character = await this.characterRepository.findByUserIdOrThrow(userId)

    const inventory = (character.inventory as unknown as InventoryItem[]) || []
    const loadout = (character.loadout as unknown as InventoryItem[]) || []

    let itemToEquip: InventoryItem | undefined
    const itemIndex = inventory.findIndex((item) => item.id === itemId)

    if (itemIndex !== -1) {
      itemToEquip = inventory[itemIndex]
    } else {
      const tier1Definition = TIER_1_ITEMS[itemId]
      if (tier1Definition) {
        itemToEquip = {
          ...createInventoryItem(tier1Definition),
          id: tier1Definition.id
        }
      }
    }

    if (!itemToEquip) {
      throw new TRPCError({ code: 'NOT_FOUND', message: `Item ${itemId} not found` })
    }

    const slotType = this.getSlotType(itemToEquip.type)

    const existingItemIndex = loadout.findIndex((item) => {
      const existingSlot = this.getSlotType(item.type)
      return existingSlot === slotType
    })

    const newInventory = [...inventory]
    if (itemIndex !== -1) {
      newInventory.splice(itemIndex, 1)
    }

    const newLoadout = [...loadout]
    if (existingItemIndex !== -1) {
      const existingItem = newLoadout[existingItemIndex]
      const isTier1 = existingItem.definitionId ? !!TIER_1_ITEMS[existingItem.definitionId] : false
      if (!isTier1) {
        newInventory.push(existingItem)
      }
      newLoadout.splice(existingItemIndex, 1)
    }

    newLoadout.push(itemToEquip)

    await this.characterRepository.updateInventoryAndLoadout(character.id, newInventory, newLoadout)

    return { success: true }
  }

  async unequipItem(userId: string, slotType: string): Promise<{ success: boolean }> {
    const character = await this.characterRepository.findByUserIdOrThrow(userId)

    const inventory = (character.inventory as unknown as InventoryItem[]) || []
    const loadout = (character.loadout as unknown as InventoryItem[]) || []

    const itemIndex = loadout.findIndex((item) => this.getSlotType(item.type) === slotType)
    if (itemIndex === -1) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'No item equipped in that slot' })
    }

    const itemToUnequip = loadout[itemIndex]

    const newLoadout = [...loadout]
    newLoadout.splice(itemIndex, 1)

    const isTier1 = itemToUnequip.definitionId ? !!TIER_1_ITEMS[itemToUnequip.definitionId] : false
    const newInventory = isTier1 ? [...inventory] : [...inventory, itemToUnequip]

    await this.characterRepository.updateInventoryAndLoadout(character.id, newInventory, newLoadout)

    return { success: true }
  }

  async hasCharacter(userId: string): Promise<boolean> {
    const count = await this.characterRepository.count(userId)
    return count > 0
  }

  async revive(userId: string): Promise<{ success: boolean }> {
    const character = await this.characterRepository.findWithClassesOrThrow(userId)
    const currentClass = character.classes.find((c) => c.className === character.currentClass)

    if (!currentClass) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Current class not found' })
    }

    await this.characterRepository.updateHealth(currentClass.id, currentClass.maxHealth, currentClass.maxMana)

    return { success: true }
  }

  async updateHealth(classId: string, health: number, mana: number): Promise<void> {
    await this.characterRepository.updateHealth(classId, health, mana)
  }

  async updateProgress(classId: string, tier: number, maxHealth: number, maxMana: number): Promise<void> {
    await this.characterRepository.updateProgress(classId, tier, maxHealth, maxMana)
  }

  async updateData(characterId: string, data: any): Promise<void> {
    await this.characterRepository.updateCharacterData(characterId, data)
  }

  private getSlotType(itemType: string): string {
    if (itemType.startsWith('WEAPON_')) return 'WEAPON'
    if (itemType === ItemType.ARMOR) return ItemType.ARMOR
    return ItemType.ACCESSORY
  }

  async getAvailableAbilitiesForCharacter(userId: string): Promise<AbilityDefinition[]> {
    const character = await this.characterRepository.getCharacterWithClasses(userId)
    if (!character) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Character not found' })
    }

    const currentClass = character.classes.find((c) => c.className === character.currentClass)
    if (!currentClass) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Current class not found' })
    }

    return getAvailableAbilities(
      currentClass.className as CharacterClassName,
      currentClass.tier,
      character.magicNature as MagicNature | undefined
    )
  }

  async getEquippedAbilities(userId: string): Promise<AbilityDefinition[]> {
    const character = await this.characterRepository.getCharacterWithClasses(userId)
    if (!character) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Character not found' })
    }

    const currentClass = character.classes.find((c) => c.className === character.currentClass)
    if (!currentClass) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Current class not found' })
    }

    const equippedIds = (currentClass as unknown as { equippedAbilities: string[] }).equippedAbilities || []
    return equippedIds.map((id) => getAbilityById(id)).filter((d): d is AbilityDefinition => d !== undefined)
  }

  async equipAbility(userId: string, abilityId: string): Promise<{ success: boolean; equippedAbilities: string[] }> {
    const character = await this.characterRepository.getCharacterWithClasses(userId)
    if (!character) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Character not found' })
    }

    const currentClass = character.classes.find((c) => c.className === character.currentClass)
    if (!currentClass) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Current class not found' })
    }

    // Validate ability exists
    const ability = getAbilityById(abilityId)
    if (!ability) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Ability not found' })
    }

    // Validate ability is for this class
    if (ability.className !== currentClass.className) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Ability not available for this class' })
    }

    // Validate tier requirement
    if (ability.tier > currentClass.tier) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Tier requirement not met' })
    }

    // Check max equipped abilities
    const equippedAbilities = (currentClass as unknown as { equippedAbilities: string[] }).equippedAbilities || []
    if (equippedAbilities.length >= MAX_EQUIPPED_ABILITIES) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Maximum equipped abilities reached' })
    }

    // Check if already equipped
    if (equippedAbilities.includes(abilityId)) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Ability already equipped' })
    }

    // Equip the ability
    const newEquippedAbilities = [...equippedAbilities, abilityId]
    await this.characterRepository.updateCharacterClass(currentClass.id, {
      equippedAbilities: newEquippedAbilities
    })

    return { success: true, equippedAbilities: newEquippedAbilities }
  }

  async unequipAbility(
    userId: string,
    abilityId: string
  ): Promise<{ success: boolean; equippedAbilities: string[] }> {
    const character = await this.characterRepository.getCharacterWithClasses(userId)
    if (!character) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Character not found' })
    }

    const currentClass = character.classes.find((c) => c.className === character.currentClass)
    if (!currentClass) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Current class not found' })
    }

    const equippedAbilities = (currentClass as unknown as { equippedAbilities: string[] }).equippedAbilities || []
    if (!equippedAbilities.includes(abilityId)) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Ability not equipped' })
    }

    // Remove the ability
    const newEquippedAbilities = equippedAbilities.filter((id) => id !== abilityId)
    await this.characterRepository.updateCharacterClass(currentClass.id, {
      equippedAbilities: newEquippedAbilities
    })

    return { success: true, equippedAbilities: newEquippedAbilities }
  }
}
