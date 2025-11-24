import { defaultAreas } from '@schemas/areas.schemas'
import { createCharacterSchema, switchClassSchema } from '@schemas/character.schemas'
import { TRPCError } from '@trpc/server'
import { protectedProcedure, t } from '../trpc'

export const characterRouter = t.router({
  create: protectedProcedure.input(createCharacterSchema).mutation(async ({ ctx, input }) => {
    const character = await ctx.prisma.character.create({
      data: {
        userId: ctx.user.id,
        name: input.name,
        currentClass: input.className,
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

  getCurrent: protectedProcedure.query(async ({ ctx }) => {
    const character = await ctx.prisma.character.findUnique({
      where: { userId: ctx.user.id },
      include: { classes: true }
    })

    return character
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
