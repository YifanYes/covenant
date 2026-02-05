import type { CharacterClassName, MagicNature } from '@shared/constants/classes'
import { getAvailableDoctrines, getDoctrineById, MAX_EQUIPPED_DOCTRINES } from '@shared/constants/doctrines'
import { createInventoryItem, TIER_1_ITEMS } from '@shared/constants/items'
import type { CreateCharacterType } from '@shared/schemas/character.schemas'
import type { CharacterWithClasses } from '@shared/types/character.types'
import type { DoctrineDefinition } from '@shared/types/doctrine.types'
import { ItemType, type InventoryItem } from '@shared/types/gamification.types'
import { TRPCError } from '@trpc/server'
import type { CharacterRepository } from '../repositories/character.repository'
import { getCharacterProgress } from '../utils/character.utils'

export class CharacterService {
  constructor(private characterRepository: CharacterRepository) {}

  getCharacterProgress(character: CharacterWithClasses) {
    return getCharacterProgress(character)
  }

  async createCharacter(userId: string, input: CreateCharacterType) {
    const character = await this.characterRepository.create(userId, input)
    await this.characterRepository.createAreas(userId)

    return character
  }

  async getCharacterById(characterId: string) {
    return this.characterRepository.findByIdWithClassesOrThrow(characterId)
  }

  async getCurrentClass(userId: string) {
    const character = await this.characterRepository.findWithClasses(userId)
    if (!character) return null

    const { maxDice, tier } = getCharacterProgress(character)

    return {
      id: character.id,
      name: character.name,
      title: character.title,
      factionName: character.factionName,
      magicNature: character.magicNature,
      currentClass: character.currentClass,
      data: character.data as any,
      gold: character.gold,
      maxDice,
      tier,
      inventory: character.inventory as unknown,
      loadout: character.loadout as unknown,
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
        equippedDoctrines: (c as any).equippedDoctrines || []
      }))
    }
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
    let itemIndex = inventory.findIndex((item) => item.id === itemId)

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

  async getAvailableDoctrinesForCharacter(userId: string): Promise<DoctrineDefinition[]> {
    const character = await this.characterRepository.getCharacterWithClasses(userId)
    if (!character) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Character not found' })
    }

    const currentClass = character.classes.find((c) => c.className === character.currentClass)
    if (!currentClass) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Current class not found' })
    }

    return getAvailableDoctrines(
      currentClass.className as CharacterClassName,
      currentClass.tier,
      character.magicNature as MagicNature | undefined
    )
  }

  async getEquippedDoctrines(userId: string): Promise<DoctrineDefinition[]> {
    const character = await this.characterRepository.getCharacterWithClasses(userId)
    if (!character) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Character not found' })
    }

    const currentClass = character.classes.find((c) => c.className === character.currentClass)
    if (!currentClass) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Current class not found' })
    }

    const equippedIds = (currentClass as unknown as { equippedDoctrines: string[] }).equippedDoctrines || []
    return equippedIds.map((id) => getDoctrineById(id)).filter((d): d is DoctrineDefinition => d !== undefined)
  }

  async equipDoctrine(userId: string, doctrineId: string): Promise<{ success: boolean; equippedDoctrines: string[] }> {
    const character = await this.characterRepository.getCharacterWithClasses(userId)
    if (!character) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Character not found' })
    }

    const currentClass = character.classes.find((c) => c.className === character.currentClass)
    if (!currentClass) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Current class not found' })
    }

    // Validate doctrine exists
    const doctrine = getDoctrineById(doctrineId)
    if (!doctrine) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Doctrine not found' })
    }

    // Validate doctrine is for this class
    if (doctrine.className !== currentClass.className) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Doctrine not available for this class' })
    }

    // Validate tier requirement
    if (doctrine.tier > currentClass.tier) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Tier requirement not met' })
    }

    // Check max equipped doctrines
    const equippedDoctrines = (currentClass as unknown as { equippedDoctrines: string[] }).equippedDoctrines || []
    if (equippedDoctrines.length >= MAX_EQUIPPED_DOCTRINES) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Maximum equipped doctrines reached' })
    }

    // Check if already equipped
    if (equippedDoctrines.includes(doctrineId)) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Doctrine already equipped' })
    }

    // Equip the doctrine
    const newEquippedDoctrines = [...equippedDoctrines, doctrineId]
    await this.characterRepository.updateCharacterClass(currentClass.id, {
      equippedDoctrines: newEquippedDoctrines
    })

    return { success: true, equippedDoctrines: newEquippedDoctrines }
  }

  async unequipDoctrine(
    userId: string,
    doctrineId: string
  ): Promise<{ success: boolean; equippedDoctrines: string[] }> {
    const character = await this.characterRepository.getCharacterWithClasses(userId)
    if (!character) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Character not found' })
    }

    const currentClass = character.classes.find((c) => c.className === character.currentClass)
    if (!currentClass) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Current class not found' })
    }

    const equippedDoctrines = (currentClass as unknown as { equippedDoctrines: string[] }).equippedDoctrines || []
    if (!equippedDoctrines.includes(doctrineId)) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Doctrine not equipped' })
    }

    // Remove the doctrine
    const newEquippedDoctrines = equippedDoctrines.filter((id) => id !== doctrineId)
    await this.characterRepository.updateCharacterClass(currentClass.id, {
      equippedDoctrines: newEquippedDoctrines
    })

    return { success: true, equippedDoctrines: newEquippedDoctrines }
  }
}
