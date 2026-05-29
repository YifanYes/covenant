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
import { generatePublicId } from '../lib/public-id'
import { createWithUniqueSlug } from '../lib/slug'

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
      include: { classes: true, user: { select: { tutorialSlidesSeen: true } } }
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

  async findByIdWithClasses(id: bigint): Promise<CharacterWithClasses | null> {
    const character = await this.prisma.character.findUnique({
      where: { id },
      include: { classes: true }
    })

    return character as unknown as CharacterWithClasses | null
  }

  async findBySlugWithClasses(userId: string, slug: string): Promise<CharacterWithClasses | null> {
    const character = await this.prisma.character.findUnique({
      where: { userId_slug: { userId, slug } },
      include: { classes: true }
    })
    return character as unknown as CharacterWithClasses | null
  }

  async findBySlug(userId: string, slug: string) {
    return this.prisma.character.findUnique({
      where: { userId_slug: { userId, slug } }
    })
  }

  async findByIdWithClassesOrThrow(id: bigint, userId?: string): Promise<CharacterWithClasses> {
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

  async verifyOwnership(characterId: bigint, userId: string): Promise<boolean> {
    const character = await this.prisma.character.findUnique({
      where: { id: characterId },
      select: { userId: true }
    })
    return character?.userId === userId
  }

  async updateHealth(classId: bigint, health: number, mana: number): Promise<void> {
    await this.prisma.characterClass.update({
      where: { id: classId },
      data: { health, mana }
    })
  }

  async updateProgress(classId: bigint, tier: number, maxHealth: number, maxMana: number): Promise<void> {
    await this.prisma.characterClass.update({
      where: { id: classId },
      data: { tier, maxHealth, maxMana }
    })
  }

  async updateGold(characterId: bigint, gold: number): Promise<void> {
    await this.prisma.character.update({
      where: { id: characterId },
      data: { gold }
    })
  }

  async addGold(characterId: bigint, amount: number): Promise<void> {
    await this.prisma.character.update({
      where: { id: characterId },
      data: { gold: { increment: amount } }
    })
  }

  async updateInventoryAndLoadout(
    characterId: bigint,
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
    return createWithUniqueSlug(input.name, (slug) =>
      this.prisma.character.create({
        data: {
          userId,
          slug,
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
    )
  }

  async createWithDefaults(userId: string, input: CreateCharacterType): Promise<Character> {
    return createWithUniqueSlug(input.name, (slug) =>
      this.prisma.$transaction(async (tx) => {
        const character = await tx.character.create({
          data: {
            userId,
            slug,
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
          data: defaultAreas.map((area) => ({ ...area, userId, publicId: generatePublicId() })),
          skipDuplicates: true
        })

        await tx.userTaskStatus.createMany({
          data: defaultUserTaskStatuses.map((status) => ({ ...status, userId, publicId: generatePublicId() })),
          skipDuplicates: true
        })

        return character
      })
    )
  }

  async updateManaReserve(characterId: bigint, manaReserve: number): Promise<void> {
    await this.prisma.character.update({
      where: { id: characterId },
      data: { manaReserve }
    })
  }

  async createAreas(userId: string): Promise<void> {
    await this.prisma.area.createMany({
      data: defaultAreas.map((area) => ({ ...area, userId, publicId: generatePublicId() })),
      skipDuplicates: true
    })
  }

  async createTaskStatuses(userId: string): Promise<void> {
    await this.prisma.userTaskStatus.createMany({
      data: defaultUserTaskStatuses.map((status) => ({ ...status, userId, publicId: generatePublicId() })),
      skipDuplicates: true
    })
  }

  async updateName(userId: string, name: string): Promise<Character> {
    return this.prisma.character.update({
      where: { userId },
      data: { name }
    })
  }

  async updateCharacterData(characterId: bigint, data: CharacterDataType): Promise<Character> {
    return this.prisma.character.update({
      where: { id: characterId },
      data: { data: data as unknown as Prisma.InputJsonValue }
    })
  }

  async updateInventoryAndGold(
    characterId: bigint,
    inventory: InventoryItemType[],
    gold: number
  ): Promise<Character> {
    return this.prisma.character.update({
      where: { id: characterId },
      data: { inventory: inventory as unknown as Prisma.InputJsonValue, gold }
    })
  }

  async createClass(characterId: bigint, className: string): Promise<CharacterClassType> {
    const result = await this.prisma.characterClass.create({
      data: {
        characterId,
        className,
        ...CLASS_INITIAL_STATS[className as CharacterClassName]
      }
    })
    return result as unknown as CharacterClassType
  }

  async updateCurrentClass(characterId: bigint, className: string): Promise<Character> {
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

  async updateCharacterClass(classId: bigint, data: { equippedAbilities?: string[] }): Promise<void> {
    await this.prisma.characterClass.update({
      where: { id: classId },
      data
    })
  }

  async updateFaction(characterId: bigint, faction: string): Promise<Character> {
    return this.prisma.character.update({
      where: { id: characterId },
      data: { factionName: faction }
    })
  }

  async updateTitle(characterId: bigint, title: string | null): Promise<Character> {
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

  async getOnboardingProgress(userId: string): Promise<Record<string, unknown>> {
    const row = await this.prisma.character.findUnique({
      where: { userId },
      select: { onboardingProgress: true }
    })
    return (row?.onboardingProgress as Record<string, unknown> | null) ?? {}
  }

  async updateOnboardingProgress(userId: string, patch: Record<string, unknown>): Promise<void> {
    if (Object.keys(patch).length === 0) return
    // Defense in depth: `loopClosedAt` is server-only (set via `setLoopClosedAt`).
    // Strip it here so a misrouted client payload can never flip the activation guard.
    if ('loopClosedAt' in patch) {
      const { loopClosedAt: _stripped, ...rest } = patch
      patch = rest
      if (Object.keys(patch).length === 0) return
    }
    const patchJson = JSON.stringify(patch)
    await this.prisma.$executeRaw`
      UPDATE "characters"
      SET "onboardingProgress" = COALESCE("onboardingProgress", '{}'::jsonb) || ${patchJson}::jsonb
      WHERE "userId" = ${userId}
        AND COALESCE("onboardingProgress", '{}'::jsonb)
            IS DISTINCT FROM
            (COALESCE("onboardingProgress", '{}'::jsonb) || ${patchJson}::jsonb)
    `
  }

  // Server-only path for the PostHog `loop_closed` guard. Kept separate from
  // `updateOnboardingProgress` so a router payload can never land here.
  async setLoopClosedAt(userId: string, iso: string): Promise<boolean> {
    const patchJson = JSON.stringify({ loopClosedAt: iso })
    const updated = await this.prisma.$executeRaw`
      UPDATE "characters"
      SET "onboardingProgress" = COALESCE("onboardingProgress", '{}'::jsonb) || ${patchJson}::jsonb
      WHERE "userId" = ${userId}
        AND NOT (COALESCE("onboardingProgress", '{}'::jsonb) ? 'loopClosedAt')
    `
    return updated > 0
  }
}
