import { Prisma, type Character, type PrismaClient } from '@/generated/prisma'
import { CharacterClassName, CLASS_INITIAL_STATS } from '@/shared/constants/classes.constants'
import { Faction } from '@/shared/constants/factions.constants'
import { defaultAreas } from '@shared/schemas/areas.schemas'
import type { CreateCharacterType } from '@shared/schemas/character.schemas'
import { defaultUserTaskStatuses } from '@shared/schemas/user-task-statuses.schemas'
import type { CharacterDataType, InventoryItemType } from '@shared/schemas/inventory.schemas'
import type { CharacterClassType, CharacterWithClasses } from '@shared/types/character.types'
import { TRPCError } from '@trpc/server'
import { RESOURCE_NOT_FOUND_OR_FORBIDDEN, resourceNotFound } from '../lib/errors'
import { logger } from '../lib/logger'

const log = logger.child({ component: 'character-repository' })

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
      log.warn({ userId }, 'findByUserIdOrThrow: character not found')
      throw resourceNotFound()
    }
    return character
  }

  async findWithClasses(userId: string): Promise<CharacterWithClasses | null> {
    const character = await this.prisma.character.findUnique({
      where: { userId },
      include: { classes: true, user: { select: { tutorialCompletedAt: true } } }
    })

    return character as unknown as CharacterWithClasses | null
  }

  async findWithClassesOrThrow(userId: string): Promise<CharacterWithClasses> {
    const character = await this.findWithClasses(userId)
    if (!character) {
      log.warn({ userId }, 'findWithClassesOrThrow: character not found')
      throw resourceNotFound()
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

  async findByIdWithClassesOrThrow(id: string, userId?: string): Promise<CharacterWithClasses> {
    const character = await this.findByIdWithClasses(id)
    if (!character) {
      throw new TRPCError({ code: 'NOT_FOUND', message: RESOURCE_NOT_FOUND_OR_FORBIDDEN })
    }
    if (userId !== undefined && character.userId !== userId) {
      log.warn({ resourceId: id, requestingUserId: userId }, 'Unauthorized character access attempt')
      throw new TRPCError({ code: 'NOT_FOUND', message: RESOURCE_NOT_FOUND_OR_FORBIDDEN })
    }
    return character
  }

  async verifyOwnership(characterId: string, userId: string): Promise<boolean> {
    const character = await this.prisma.character.findUnique({
      where: { id: characterId },
      select: { userId: true }
    })
    return character?.userId === userId
  }

  async updateHealth(classId: string, health: number, mana: number): Promise<void> {
    await this.prisma.characterClass.update({
      where: { id: classId },
      data: { health, mana }
    })
  }

  async updateProgress(classId: string, tier: number, maxHealth: number, maxMana: number): Promise<void> {
    await this.prisma.characterClass.update({
      where: { id: classId },
      data: { tier, maxHealth, maxMana }
    })
  }

  async updateGold(characterId: string, gold: number): Promise<void> {
    await this.prisma.character.update({
      where: { id: characterId },
      data: { gold }
    })
  }

  async addGold(characterId: string, amount: number): Promise<void> {
    await this.prisma.character.update({
      where: { id: characterId },
      data: { gold: { increment: amount } }
    })
  }

  async updateInventoryAndLoadout(
    characterId: string,
    inventory: InventoryItemType[],
    loadout: InventoryItemType[]
  ): Promise<void> {
    await this.prisma.character.update({
      where: { id: characterId },
      data: {
        inventory: inventory as unknown as Prisma.InputJsonValue,
        loadout: loadout as unknown as Prisma.InputJsonValue
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
        data: {},
        gold: 0,
        manaReserve: 0,
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

  async createWithDefaults(userId: string, input: CreateCharacterType): Promise<Character> {
    return this.prisma.$transaction(async (tx) => {
      const character = await tx.character.create({
        data: {
          userId,
          name: input.name,
          factionName: Faction.HOLY_KNIGHTS,
          currentClass: input.className,
          magicNature: input.magicNature,
          data: {},
          gold: 0,
          manaReserve: 0,
          inventory: [],
          loadout: [],
          classes: {
            create: {
              className: input.className,
              ...CLASS_INITIAL_STATS[input.className as CharacterClassName]
            }
          }
        },
        include: { classes: true }
      })

      await tx.area.createMany({
        data: defaultAreas.map((area) => ({ ...area, userId })),
        skipDuplicates: true
      })

      await tx.userTaskStatus.createMany({
        data: defaultUserTaskStatuses.map((status) => ({ ...status, userId })),
        skipDuplicates: true
      })

      return character
    })
  }

  async updateManaReserve(characterId: string, manaReserve: number): Promise<void> {
    await this.prisma.character.update({
      where: { id: characterId },
      data: { manaReserve }
    })
  }

  async createAreas(userId: string): Promise<void> {
    await this.prisma.area.createMany({
      data: defaultAreas.map((area) => ({ ...area, userId })),
      skipDuplicates: true
    })
  }

  async createTaskStatuses(userId: string): Promise<void> {
    await this.prisma.userTaskStatus.createMany({
      data: defaultUserTaskStatuses.map((status) => ({ ...status, userId })),
      skipDuplicates: true
    })
  }

  async updateName(userId: string, name: string): Promise<Character> {
    return this.prisma.character.update({
      where: { userId },
      data: { name }
    })
  }

  async updateCharacterData(characterId: string, data: CharacterDataType): Promise<Character> {
    return this.prisma.character.update({
      where: { id: characterId },
      data: { data: data as unknown as Prisma.InputJsonValue }
    })
  }

  async updateInventoryAndGold(
    characterId: string,
    inventory: InventoryItemType[],
    gold: number
  ): Promise<Character> {
    return this.prisma.character.update({
      where: { id: characterId },
      data: { inventory: inventory as unknown as Prisma.InputJsonValue, gold }
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

  async updateCharacterClass(classId: string, data: { equippedAbilities?: string[] }): Promise<void> {
    await this.prisma.characterClass.update({
      where: { id: classId },
      data
    })
  }

  async updateFaction(characterId: string, faction: string): Promise<Character> {
    return this.prisma.character.update({
      where: { id: characterId },
      data: { factionName: faction }
    })
  }

  async updateTitle(characterId: string, title: string | null): Promise<Character> {
    return this.prisma.character.update({
      where: { id: characterId },
      data: { title }
    })
  }

  async clearTitlesForUsers(userIds: string[], titles: string[]): Promise<void> {
    if (userIds.length === 0 || titles.length === 0) return
    await this.prisma.character.updateMany({
      where: { userId: { in: userIds }, title: { in: titles } },
      data: { title: null }
    })
  }

  async clearTitleForUser(userId: string): Promise<void> {
    await this.prisma.character.updateMany({
      where: { userId },
      data: { title: null }
    })
  }
}
