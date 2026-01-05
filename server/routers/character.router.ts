import { getMaxDiceForTier, getTierFromLevel } from '@shared/constants/dice.constants'
import { defaultAreas } from '@shared/schemas/areas.schemas'
import { createCharacterSchema, switchClassSchema } from '@shared/schemas/character.schemas'
import { TRPCError } from '@trpc/server'
import { protectedProcedure, t } from '../trpc'

export const characterRouter = t.router({
  create: protectedProcedure.input(createCharacterSchema).mutation(async ({ ctx, input }) => {
    const character = await ctx.prisma.character.create({
      data: {
        userId: ctx.user.id,
        name: input.name,
        currentClass: input.className,
        data: { diceBank: 0 }, // Start with 0 dice
        gold: 0,
        inventory: [],
        loadout: [],
        classes: {
          create: {
            className: input.className
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

  getCurrentClass: protectedProcedure.query(async ({ ctx }) => {
    const character = await ctx.prisma.character.findUnique({
      where: { userId: ctx.user.id },
      include: { classes: true }
    })

    if (!character) return null

    const currentClass = character.classes.find((c) => c.className === character.currentClass)
    const tier = getTierFromLevel(currentClass?.level || 1)
    const maxDice = getMaxDiceForTier(tier)

    return {
      id: character.id,
      name: character.name,
      title: character.title,
      orderName: character.orderName,
      currentClass: character.currentClass,
      data: character.data as any,
      gold: character.gold,
      maxDice,
      classes: character.classes.map((c) => ({
        id: c.id,
        className: c.className,
        level: c.level,
        exp: c.exp,
        health: c.health,
        mana: c.mana,
        strengthAtk: c.strengthAtk,
        strengthDef: c.strengthDef,
        magicAtk: c.magicAtk,
        magicDef: c.magicDef
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
          className: input.className
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
  })
})
