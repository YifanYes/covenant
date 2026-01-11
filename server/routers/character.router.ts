import { CharacterClassName, CLASS_INITIAL_STATS } from '@shared/constants/classes'
import { createInventoryItem, TIER_1_ITEMS } from '@shared/constants/items'
import { defaultAreas } from '@shared/schemas/areas.schemas'
import {
  createCharacterSchema,
  equipItemSchema,
  switchClassSchema,
  unequipItemSchema
} from '@shared/schemas/character.schemas'
import type { InventoryItem } from '@shared/types/gamification.types'
import { TRPCError } from '@trpc/server'
import { createRandomPartyName, getCharacterProgress, getSlotType } from '../services/character.services'
import { protectedProcedure, t } from '../trpc'

export const characterRouter = t.router({
  create: protectedProcedure.input(createCharacterSchema).mutation(async ({ ctx, input }) => {
    const randomPartyName = createRandomPartyName()

    const party = await ctx.prisma.party.create({
      data: { name: randomPartyName }
    })

    const character = await ctx.prisma.character.create({
      data: {
        userId: ctx.user.id,
        name: input.name,
        currentClass: input.className,
        data: { diceBank: 0 },
        gold: 0,
        inventory: [],
        loadout: [],
        partyId: party.id,
        classes: {
          create: {
            className: input.className,
            ...CLASS_INITIAL_STATS[input.className as CharacterClassName]
          }
        }
      },
      include: {
        classes: true
      }
    })

    // Create default areas
    await ctx.prisma.area.createMany({
      data: defaultAreas.map((area) => ({
        ...area,
        userId: ctx.user.id
      }))
    })

    return character
  }),

  hasCharacter: protectedProcedure.query(async ({ ctx }) => {
    const count = await ctx.prisma.character.count({
      where: { userId: ctx.user.id }
    })
    return { hasCharacter: count > 0 }
  }),

  getCurrentClass: protectedProcedure.query(async ({ ctx }) => {
    const character = await ctx.prisma.character.findUnique({
      where: { userId: ctx.user.id },
      include: { classes: true }
    })

    if (!character) return null

    const { maxDice, tier } = getCharacterProgress(character)

    return {
      id: character.id,
      name: character.name,
      title: character.title,
      orderName: character.orderName,
      currentClass: character.currentClass,
      data: character.data as any,
      gold: character.gold,
      maxDice,
      tier,
      // Use unknown to break Prisma's recursive JsonValue type
      inventory: character.inventory as unknown,
      loadout: character.loadout as unknown,
      classes: character.classes.map((c) => ({
        id: c.id,
        className: c.className,
        tier: c.tier,
        missionProgress: c.missionProgress as Record<string, number>,
        health: c.health,
        mana: c.mana,
        maxHealth: c.maxHealth,
        maxMana: c.maxMana,
        strengthAtk: c.strengthAtk,
        strengthDef: c.strengthDef,
        magicAtk: c.magicAtk,
        magicDef: c.magicDef,
        manaRegen: c.manaRegen
      }))
    }
  }),

  switchClass: protectedProcedure.input(switchClassSchema).mutation(async ({ ctx, input }) => {
    const character = await ctx.prisma.character.findUnique({
      where: { userId: ctx.user.id },
      include: { classes: true }
    })

    if (!character) {
      throw new TRPCError({ code: 'NOT_FOUND', message: `Character not found` })
    }

    // Check if CharacterClass exists for this class
    let characterClass = character.classes.find((c) => c.className === input.className)

    if (!characterClass) {
      // Create new CharacterClass
      characterClass = await ctx.prisma.characterClass.create({
        data: {
          characterId: character.id,
          className: input.className,
          ...CLASS_INITIAL_STATS[input.className as CharacterClassName]
        }
      })
    }

    // Update currentClass
    const updatedCharacter = await ctx.prisma.character.update({
      where: { id: character.id },
      data: { currentClass: input.className },
      include: { classes: true }
    })

    return updatedCharacter
  }),

  equipItem: protectedProcedure.input(equipItemSchema).mutation(async ({ ctx, input }) => {
    const character = await ctx.prisma.character.findUnique({
      where: { userId: ctx.user.id }
    })

    if (!character) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Character not found' })
    }

    const inventory = (character.inventory as unknown as InventoryItem[]) || []
    const loadout = (character.loadout as unknown as InventoryItem[]) || []

    // Try to find item in inventory first
    let itemToEquip: InventoryItem | undefined
    let itemIndex = inventory.findIndex((item) => item.id === input.itemId)

    if (itemIndex !== -1) {
      // Item found in inventory (purchased items)
      itemToEquip = inventory[itemIndex]
    } else {
      // Check if it's a tier 1 item (itemId matches definitionId for virtual items)
      const tier1Definition = TIER_1_ITEMS.find((def) => def.id === input.itemId)
      if (tier1Definition) {
        // Create virtual tier 1 item
        itemToEquip = {
          ...createInventoryItem(tier1Definition),
          id: tier1Definition.id // Keep definition id as id for consistency
        }
      }
    }

    if (!itemToEquip) {
      throw new TRPCError({ code: 'NOT_FOUND', message: `Item ${input.itemId} not found` })
    }

    const slotType = getSlotType(itemToEquip.type)

    // Check if there's already an item in the slot
    const existingItemIndex = loadout.findIndex((item) => {
      const existingSlot = getSlotType(item.type)
      return existingSlot === slotType
    })

    // Only remove from inventory if it was a purchased item (not tier 1)
    const newInventory = [...inventory]
    if (itemIndex !== -1) {
      newInventory.splice(itemIndex, 1)
    }

    // If there's an existing item in the slot, move it back to inventory (only if not tier 1)
    const newLoadout = [...loadout]
    if (existingItemIndex !== -1) {
      const existingItem = newLoadout[existingItemIndex]
      // Only add back to inventory if it's not a tier 1 item
      const isTier1 = TIER_1_ITEMS.some((def) => def.id === existingItem.definitionId)
      if (!isTier1) {
        newInventory.push(existingItem)
      }
      newLoadout.splice(existingItemIndex, 1)
    }

    // Add new item to loadout
    newLoadout.push(itemToEquip)

    await ctx.prisma.character.update({
      where: { id: character.id },
      data: {
        inventory: newInventory as any,
        loadout: newLoadout as any
      }
    })

    return { success: true }
  }),

  unequipItem: protectedProcedure.input(unequipItemSchema).mutation(async ({ ctx, input }) => {
    const character = await ctx.prisma.character.findUnique({
      where: { userId: ctx.user.id }
    })

    if (!character) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Character not found' })
    }

    const inventory = (character.inventory as unknown as InventoryItem[]) || []
    const loadout = (character.loadout as unknown as InventoryItem[]) || []

    const itemIndex = loadout.findIndex((item) => getSlotType(item.type) === input.slotType)
    if (itemIndex === -1) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'No item equipped in that slot' })
    }

    const itemToUnequip = loadout[itemIndex]

    // Move item from loadout to inventory (only if it's not a tier 1 item)
    const newLoadout = [...loadout]
    newLoadout.splice(itemIndex, 1)

    // Only add to inventory if it's not a tier 1 item (tier 1 items are virtual)
    const isTier1 = TIER_1_ITEMS.some((def) => def.id === itemToUnequip.definitionId)
    const newInventory = isTier1 ? [...inventory] : [...inventory, itemToUnequip]

    await ctx.prisma.character.update({
      where: { id: character.id },
      data: {
        inventory: newInventory as any,
        loadout: newLoadout as any
      }
    })

    return { success: true }
  })
})
