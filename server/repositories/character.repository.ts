import { CharacterClassName, CLASS_INITIAL_STATS } from '@shared/constants/classes'
import { defaultAreas } from '@shared/schemas/areas.schemas'
import type { CreateCharacterType } from '@shared/schemas/character.schemas'
import type {
  CharacterWithClasses,
  CharacterWithClassesAndParty,
  CharacterWithParty
} from '@shared/types/character.types'
import { TRPCError } from '@trpc/server'
import { type Character, type CharacterClass, type PrismaClient } from '../generated/prisma'

export class CharacterRepository {
  constructor(private prisma: PrismaClient) {}

  async findByUserId(userId: string): Promise<Character | null> {
    return this.prisma.character.findUnique({
      where: { userId }
    })
  }

  async findByUserIdOrThrow(userId: string): Promise<Character> {
    const character = await this.findByUserId(userId)
    if (!character) {
      throw new TRPCError({ code: 'NOT_FOUND', message: `Character not found for user ${userId}` })
    }
    return character
  }

  async findWithClasses(userId: string): Promise<CharacterWithClasses | null> {
    const character = await this.prisma.character.findUnique({
      where: { userId },
      include: { classes: true }
    })
    return character
  }

  async findWithClassesOrThrow(userId: string): Promise<CharacterWithClasses> {
    const character = await this.findWithClasses(userId)
    if (!character) {
      throw new TRPCError({ code: 'NOT_FOUND', message: `Character not found for user ${userId}` })
    }
    return character
  }

  async findWithParty(userId: string): Promise<CharacterWithParty | null> {
    const character = await this.prisma.character.findUnique({
      where: { userId },
      include: { party: true }
    })
    if (!character || !character.party) return null
    return character as CharacterWithParty
  }

  async findWithClassesAndParty(userId: string): Promise<CharacterWithClassesAndParty | null> {
    const character = await this.prisma.character.findUnique({
      where: { userId },
      include: { classes: true, party: true }
    })
    if (!character || !character.party) return null
    return character as CharacterWithClassesAndParty
  }

  async findWithClassesAndPartyOrThrow(userId: string): Promise<CharacterWithClassesAndParty> {
    const character = await this.findWithClassesAndParty(userId)
    if (!character) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Character or party not found' })
    }
    return character
  }

  async findWithPartyOrThrow(userId: string): Promise<CharacterWithParty> {
    const character = await this.findWithParty(userId)
    if (!character) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Character or party not found' })
    }
    return character
  }

  async updateDiceBank(characterId: string, characterData: Record<string, unknown>, newDice: number): Promise<void> {
    await this.prisma.character.update({
      where: { id: characterId },
      data: {
        data: { ...characterData, diceBank: newDice }
      }
    })
  }

  async updateHealth(classId: string, health: number, mana: number): Promise<void> {
    await this.prisma.characterClass.update({
      where: { id: classId },
      data: { health, mana }
    })
  }

  async updateGold(characterId: string, gold: number): Promise<void> {
    await this.prisma.character.update({
      where: { id: characterId },
      data: { gold }
    })
  }

  async updateInventoryAndLoadout(characterId: string, inventory: unknown[], loadout: unknown[]): Promise<void> {
    await this.prisma.character.update({
      where: { id: characterId },
      data: {
        inventory: inventory as any,
        loadout: loadout as any
      }
    })
  }

  async count(userId: string): Promise<number> {
    return this.prisma.character.count({
      where: { userId }
    })
  }

  async create(userId: string, input: CreateCharacterType, partyId: string): Promise<Character> {
    return this.prisma.character.create({
      data: {
        userId,
        name: input.name,
        currentClass: input.className,
        magicNature: input.magicNature,
        data: { diceBank: 0 },
        gold: 0,
        inventory: [],
        loadout: [],
        partyId,
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
  }

  async createAreas(userId: string): Promise<void> {
    await this.prisma.area.createMany({
      data: defaultAreas.map((area) => ({
        ...area,
        userId
      }))
    })
  }

  async updateCharacterData(characterId: string, data: any): Promise<Character> {
    return this.prisma.character.update({
      where: { id: characterId },
      data: { data }
    })
  }

  async updateInventoryAndGold(characterId: string, inventory: any, gold: number): Promise<Character> {
    return this.prisma.character.update({
      where: { id: characterId },
      data: { inventory, gold }
    })
  }

  async createClass(characterId: string, className: string): Promise<CharacterClass> {
    return this.prisma.characterClass.create({
      data: {
        characterId,
        className,
        ...CLASS_INITIAL_STATS[className as CharacterClassName]
      }
    })
  }

  async updateCurrentClass(characterId: string, className: string): Promise<Character> {
    return this.prisma.character.update({
      where: { id: characterId },
      data: { currentClass: className },
      include: { classes: true }
    })
  }

  async deleteManyByUserId(userId: string): Promise<void> {
    await this.prisma.character.deleteMany({
      where: { userId }
    })
  }
}
