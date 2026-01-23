import { vi } from 'vitest'
import type { PrismaClient } from '../../generated/prisma'

export type MockPrismaClient = {
  [K in keyof PrismaClient]: {
    [M in keyof PrismaClient[K]]: ReturnType<typeof vi.fn>
  }
} & {
  $connect: ReturnType<typeof vi.fn>
  $disconnect: ReturnType<typeof vi.fn>
  $transaction: ReturnType<typeof vi.fn>
}

export const createMockPrisma = (): MockPrismaClient => {
  return {
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    $transaction: vi.fn((callback) => callback(createMockPrisma())),
    // Add models as needed
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      upsert: vi.fn(),
      count: vi.fn()
    },
    character: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    task: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    habit: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    habitCompletion: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    activity: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    combatEnemy: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    activityParticipation: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    inventoryItem: {
      create: vi.fn(),
      findMany: vi.fn()
    }
  } as unknown as MockPrismaClient
}
