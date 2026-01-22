import { Faction } from '@shared/constants/activities'
import { CharacterClassName, CLASS_INITIAL_STATS } from '@shared/constants/classes'
import { defaultAreas } from '@shared/schemas/areas.schemas'
import type { CreateCharacterType } from '@shared/schemas/character.schemas'
import type { CharacterClassType, CharacterWithClasses } from '@shared/types/character.types'
import { TRPCError } from '@trpc/server'
import { type Character, type PrismaClient } from '../generated/prisma'

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

    return character as unknown as CharacterWithClasses | null
  }

  async findWithClassesOrThrow(userId: string): Promise<CharacterWithClasses> {
    const character = await this.findWithClasses(userId)
    if (!character) {
      throw new TRPCError({ code: 'NOT_FOUND', message: `Character not found for user ${userId}` })
    }
    return character
  }

  async findByIdWithClasses(id: string): Promise<CharacterWithClasses | null> {
    const character = await this.prisma.character.findUnique({
      where: { id },
      include: { classes: true }
    })

    return character as unknown as CharacterWithClasses | null
  }

  async findByIdWithClassesOrThrow(id: string): Promise<CharacterWithClasses> {
    const character = await this.findByIdWithClasses(id)
    if (!character) {
      throw new TRPCError({ code: 'NOT_FOUND', message: `Character ${id} not found` })
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

  async updateProgress(classId: string, enemiesKilled: any, tier: number): Promise<void> {
    await this.prisma.characterClass.update({
      where: { id: classId },
      data: { enemiesKilled, tier }
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

  async create(userId: string, input: CreateCharacterType): Promise<Character> {
    return this.prisma.character.create({
      data: {
        userId,
        name: input.name,
        factionName: Faction.HOLY_KNIGHTS,
        currentClass: input.className,
        magicNature: input.magicNature,
        data: { diceBank: 0 },
        gold: 0,
        inventory: [],
        loadout: [],
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

  async createClass(characterId: string, className: string): Promise<CharacterClassType> {
    const result = await this.prisma.characterClass.create({
      data: {
        characterId,
        className,
        ...CLASS_INITIAL_STATS[className as CharacterClassName]
      }
    })
    return result as unknown as CharacterClassType
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

  async getCharacterWithClasses(userId: string): Promise<CharacterWithClasses | null> {
    return this.findWithClasses(userId)
  }

  async updateCharacterClass(classId: string, data: { equippedDoctrines?: string[] }): Promise<void> {
    await this.prisma.characterClass.update({
      where: { id: classId },
      data
    })
  }
}
