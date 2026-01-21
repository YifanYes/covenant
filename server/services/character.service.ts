import { getMaxDiceForTier } from '@shared/constants/dice.constants'
import { createInventoryItem, TIER_1_ITEMS } from '@shared/constants/items'
import type { CreateCharacterType } from '@shared/schemas/character.schemas'
import type { CharacterClassType, CharacterProgress, CharacterWithClasses } from '@shared/types/character.types'
import { ItemType, type InventoryItem } from '@shared/types/gamification.types'
import { TRPCError } from '@trpc/server'
import type { PrismaClient } from '../generated/prisma'
import { CharacterRepository } from '../repositories/character.repository'
export class CharacterService {
  private characterRepository: CharacterRepository

  constructor(prisma: PrismaClient) {
    this.characterRepository = new CharacterRepository(prisma)
  }

  getCharacterProgress(character: CharacterWithClasses): CharacterProgress {
    const currentClass = character.classes.find((c) => c.className === character.currentClass)
    const tier = currentClass?.tier || 1
    const maxDice = getMaxDiceForTier(tier)
    const diceBank = (character.data as any)?.diceBank || 0

    return {
      currentClass: currentClass as unknown as CharacterClassType | undefined,
      tier,
      maxDice,
      diceBank
    }
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

    const { maxDice, tier } = this.getCharacterProgress(character)

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
        enemiesKilled: c.enemiesKilled
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

  async updateProgress(classId: string, enemiesKilled: any, tier: number): Promise<void> {
    await this.characterRepository.updateProgress(classId, enemiesKilled, tier)
  }

  async updateData(characterId: string, data: any): Promise<void> {
    await this.characterRepository.updateCharacterData(characterId, data)
  }

  private getSlotType(itemType: string): string {
    if (itemType.startsWith('WEAPON_')) return 'WEAPON'
    if (itemType === ItemType.ARMOR) return ItemType.ARMOR
    return ItemType.ACCESSORY
  }
}
