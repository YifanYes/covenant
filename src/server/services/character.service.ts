import { getAbilityById, getAvailableAbilities, MAX_EQUIPPED_ABILITIES } from '@/shared/constants/abilities.constants'
import type { CharacterClassName, MagicNature } from '@/shared/constants/classes.constants'
import { createInventoryItem, TIER_1_ITEMS } from '@/shared/constants/items.constants'
import type { CreateCharacterType } from '@shared/schemas/character.schemas'
import type { CharacterDataType } from '@shared/schemas/inventory.schemas'
import type {
  OnboardingProgress,
  TutorialSlideId,
  UpdateOnboardingProgressInput
} from '@shared/schemas/onboarding.schemas'
import type { AbilityDefinition } from '@shared/types/ability.types'
import type { CharacterWithClasses } from '@shared/types/character.types'
import { ItemType, type InventoryItem } from '@shared/types/gamification.types'
import { TRPCError } from '@trpc/server'
import { analytics as defaultAnalytics, type AnalyticsService } from '../lib/analytics'
import { resourceNotFound } from '../lib/errors'
import { logger } from '../lib/logger'
import type { CharacterRepository } from '../repositories/character.repository'
import type { UserRepository } from '../repositories/user.repository'
import { getCharacterProgress } from '../utils/character.utils'
import type { ManaService, ReserveBreakdown } from './mana.service'

const log = logger.child({ service: 'character' })

export class CharacterService {
  constructor(
    private characterRepository: CharacterRepository,
    private userRepository: UserRepository,
    private manaService?: ManaService,
    private analytics: AnalyticsService = defaultAnalytics
  ) {}

  getCharacterProgress(character: CharacterWithClasses) {
    return getCharacterProgress(character)
  }

  async createCharacter(userId: string, input: CreateCharacterType) {
    const character = await this.characterRepository.createWithDefaults(userId, input)
    const faction = (character as { factionName?: string | null }).factionName ?? ''
    this.analytics.setPersonProperties(userId, {
      faction,
      character_class: input.className,
      magic_nature: input.magicNature
    })
    this.analytics.track(userId, 'character_created', {
      faction,
      magic_nature: input.magicNature,
      character_class: input.className
    })
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
    if (this.manaService && (character.data as CharacterDataType | null)?.scrubbedManaPotions !== true) {
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
      data: (character.data as CharacterDataType | null) ?? null,
      gold: character.gold,
      manaReserve: character.manaReserve ?? 0,
      tier,
      inventory: character.inventory as unknown as InventoryItem[],
      loadout: character.loadout as unknown as InventoryItem[],
      tutorialSlidesSeen: ((character.user?.tutorialSlidesSeen as TutorialSlideId[] | null) ?? []) as TutorialSlideId[],
      onboardingProgress: ((character.onboardingProgress as OnboardingProgress | null) ?? {}) as OnboardingProgress,
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

  async getTodayReserveBreakdown(userId: string, timezoneOffset = 0): Promise<ReserveBreakdown> {
    return (
      this.manaService?.getTodayReserveBreakdown(userId, timezoneOffset) ?? {
        habits: { count: 0, mana: 0 },
        tasks: { count: 0, mana: 0 },
        objectives: { count: 0, mana: 0 },
        journals: { count: 0, mana: 0 },
        total: 0
      }
    )
  }

  async updateName(userId: string, name: string) {
    return this.characterRepository.updateName(userId, name)
  }

  async markTutorialSlideSeen(userId: string, slideId: TutorialSlideId) {
    const seen = await this.userRepository.getTutorialSlidesSeen(userId)
    if (seen.includes(slideId)) {
      return { tutorialSlidesSeen: seen }
    }
    const next = [...seen, slideId]
    await this.userRepository.setTutorialSlidesSeen(userId, next)
    return { tutorialSlidesSeen: next }
  }

  async resetTutorialSlides(userId: string) {
    await this.userRepository.setTutorialSlidesSeen(userId, [])
    return { tutorialSlidesSeen: [] as TutorialSlideId[] }
  }

  async updateOnboardingProgress(userId: string, patch: UpdateOnboardingProgressInput) {
    await this.characterRepository.updateOnboardingProgress(userId, patch)
  }

  async dismissOnboarding(userId: string) {
    await this.characterRepository.updateOnboardingProgress(userId, { dismissedAt: new Date().toISOString() })
  }

  async reopenOnboarding(userId: string) {
    await this.characterRepository.updateOnboardingProgress(userId, { dismissedAt: undefined })
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
      log.warn({ userId, itemId }, 'equipItem: item not found')
      throw resourceNotFound()
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

    const progress = (character.onboardingProgress as OnboardingProgress | null) ?? {}
    if (!progress.gearEquipped) {
      try {
        await this.characterRepository.updateOnboardingProgress(userId, { gearEquipped: true })
      } catch (err) {
        log.warn({ err, userId }, 'onboarding tick failed: gearEquipped')
      }
    }

    return { success: true }
  }

  async unequipItem(userId: string, slotType: string): Promise<{ success: boolean }> {
    const character = await this.characterRepository.findByUserIdOrThrow(userId)

    const inventory = (character.inventory as unknown as InventoryItem[]) || []
    const loadout = (character.loadout as unknown as InventoryItem[]) || []

    const itemIndex = loadout.findIndex((item) => this.getSlotType(item.type) === slotType)
    if (itemIndex === -1) {
      log.warn({ userId, slotType }, 'unequipItem: no item equipped in that slot')
      throw resourceNotFound()
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
      log.error({ userId, currentClass: character.currentClass }, 'revive: current class not found (data integrity)')
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Current class not found' })
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

  async updateData(characterId: string, data: CharacterDataType): Promise<void> {
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
      log.warn({ userId }, 'getAvailableAbilitiesForCharacter: character not found')
      throw resourceNotFound()
    }

    const currentClass = character.classes.find((c) => c.className === character.currentClass)
    if (!currentClass) {
      log.error({ userId, currentClass: character.currentClass }, 'getAvailableAbilitiesForCharacter: current class not found (data integrity)')
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Current class not found' })
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
      log.warn({ userId }, 'getEquippedAbilities: character not found')
      throw resourceNotFound()
    }

    const currentClass = character.classes.find((c) => c.className === character.currentClass)
    if (!currentClass) {
      log.error({ userId, currentClass: character.currentClass }, 'getEquippedAbilities: current class not found (data integrity)')
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Current class not found' })
    }

    const equippedIds = (currentClass as unknown as { equippedAbilities: string[] }).equippedAbilities || []
    return equippedIds.map((id) => getAbilityById(id)).filter((d): d is AbilityDefinition => d !== undefined)
  }

  async equipAbility(userId: string, abilityId: string): Promise<{ success: boolean; equippedAbilities: string[] }> {
    const character = await this.characterRepository.getCharacterWithClasses(userId)
    if (!character) {
      log.warn({ userId }, 'equipAbility: character not found')
      throw resourceNotFound()
    }

    const currentClass = character.classes.find((c) => c.className === character.currentClass)
    if (!currentClass) {
      log.error({ userId, currentClass: character.currentClass }, 'equipAbility: current class not found (data integrity)')
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Current class not found' })
    }

    const ability = getAbilityById(abilityId)
    if (!ability) {
      log.warn({ userId, abilityId }, 'equipAbility: ability id not found')
      throw resourceNotFound()
    }

    if (ability.className !== currentClass.className) {
      log.warn(
        { userId, abilityId, abilityClass: ability.className, currentClass: currentClass.className },
        'equipAbility: ability class mismatch'
      )
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Ability not available for this class' })
    }

    if (ability.tier > currentClass.tier) {
      log.warn(
        { userId, abilityId, abilityTier: ability.tier, currentTier: currentClass.tier },
        'equipAbility: tier requirement not met'
      )
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

  async unequipAbility(userId: string, abilityId: string): Promise<{ success: boolean; equippedAbilities: string[] }> {
    const character = await this.characterRepository.getCharacterWithClasses(userId)
    if (!character) {
      log.warn({ userId }, 'unequipAbility: character not found')
      throw resourceNotFound()
    }

    const currentClass = character.classes.find((c) => c.className === character.currentClass)
    if (!currentClass) {
      log.error({ userId, currentClass: character.currentClass }, 'unequipAbility: current class not found (data integrity)')
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Current class not found' })
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
