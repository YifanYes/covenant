import { TRPCError } from '@trpc/server'
import type { PrismaClient } from '@/generated/prisma'
import { RESOURCE_NOT_FOUND_OR_FORBIDDEN } from '../lib/errors'
import { logger } from '../lib/logger'

const log = logger.child({ component: 'base-repository' })

/**
 * Base repository providing common CRUD operations.
 *
 * @template T The entity type returned by the repository
 * @template TModel The Prisma model delegate type
 */
export abstract class BaseRepository<T extends { id: bigint }> {
  constructor(protected prisma: PrismaClient) {}

  /**
   * The Prisma model delegate for this entity.
   * Subclasses must implement this to return the appropriate model.
   */
  protected abstract get model(): {
    findUnique: (args: { where: { id: bigint } }) => Promise<T | null>
    delete: (args: { where: { id: bigint } }) => Promise<T>
  }

  /**
   * Find an entity by its ID.
   */
  async findById(id: bigint): Promise<T | null> {
    return this.model.findUnique({ where: { id } })
  }

  /**
   * Find an entity by its ID, throwing if not found.
   */
  async findByIdOrThrow(id: bigint): Promise<T> {
    const entity = await this.findById(id)
    if (!entity) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: RESOURCE_NOT_FOUND_OR_FORBIDDEN
      })
    }
    return entity
  }

  /**
   * Delete an entity by its ID.
   */
  async delete(id: bigint): Promise<void> {
    await this.model.delete({ where: { id } })
  }
}

/**
 * Repository base class for user-scoped entities.
 * Provides ownership validation on queries.
 *
 * @template T The entity type returned by the repository
 */
export abstract class UserScopedRepository<
  T extends { id: bigint; userId: string }
> extends BaseRepository<T> {
  protected abstract override get model(): {
    findUnique: (args: { where: { id: bigint } }) => Promise<T | null>
    findFirst: (args: { where: { userId: string } }) => Promise<T | null>
    delete: (args: { where: { id: bigint } }) => Promise<T>
  }

  /**
   * Find an entity by user ID.
   */
  async findByUserId(userId: string): Promise<T | null> {
    return this.model.findFirst({ where: { userId } })
  }

  /**
   * Find an entity by user ID, throwing if not found.
   */
  async findByUserIdOrThrow(userId: string): Promise<T> {
    const entity = await this.findByUserId(userId)
    if (!entity) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: RESOURCE_NOT_FOUND_OR_FORBIDDEN
      })
    }
    return entity
  }

  /**
   * Find an entity by ID with ownership validation.
   * Throws if the entity doesn't exist or doesn't belong to the user.
   */
  async findByIdWithOwnershipOrThrow(id: bigint, userId: string): Promise<T> {
    const entity = await this.model.findUnique({ where: { id } })
    if (!entity) {
      throw new TRPCError({ code: 'NOT_FOUND', message: RESOURCE_NOT_FOUND_OR_FORBIDDEN })
    }
    if (entity.userId !== userId) {
      log.warn({ resourceId: id, requestingUserId: userId }, 'Unauthorized resource access attempt')
      throw new TRPCError({ code: 'NOT_FOUND', message: RESOURCE_NOT_FOUND_OR_FORBIDDEN })
    }
    return entity
  }
}
