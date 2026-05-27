import type { PrismaClient } from '@/generated/prisma'
import type { Mock } from 'vitest'
import { vi } from 'vitest'

type MockedMethods<T> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock return must accept anything callers chain
  [K in keyof T]: T[K] extends (...args: infer A) => unknown ? Mock<(...args: A) => any> : T[K]
}

export type MockRepo<T> = T & MockedMethods<T>

/**
 * Proxy-backed mock that returns a fresh `vi.fn()` for any accessed property.
 * Repeated access to the same key returns the same mock, so tests can call
 * `.mockResolvedValue(...)` / `.toHaveBeenCalledWith(...)` as usual.
 *
 * Use for repository, service, and tx-model mocks where every method is a
 * `vi.fn()`. The generic `T` keeps autocomplete and type-checking on call
 * arguments while skipping the ~30 lines of `{ findById: vi.fn(), ... }` boilerplate.
 *
 * Caveat: schemas are runtime-only. Accessing a non-existent method still
 * returns a `vi.fn()` — typos become silent passes. Lean on `<T>` typing.
 */
export function createRepoMock<T extends object>(): MockRepo<T> {
  const cache = new Map<string | symbol, Mock>()
  return new Proxy({} as MockRepo<T>, {
    get(_target, prop) {
      if (prop === 'then') return undefined
      if (!cache.has(prop)) cache.set(prop, vi.fn())
      return cache.get(prop)
    },
    has() {
      return true
    }
  })
}

export type PrismaMock = PrismaClient & {
  $transaction: Mock<(input: unknown) => Promise<unknown>>
}

/**
 * Prisma stub with auto-passthrough `$transaction`.
 *
 * - Callback form (`prisma.$transaction(async (tx) => ...)`) invokes the fn with `tx`.
 * - Array form (`prisma.$transaction([p1, p2])`) returns the array as-is.
 *
 * Return type is `PrismaClient & {$transaction: Mock}` so callers can inject
 * directly into services typed `PrismaClient` without an `as never` cast, and
 * still call `.mockImplementation()` on `$transaction`.
 *
 * Pass `tx` when the service uses tx-scoped models inside the callback. Build
 * those with `createRepoMock<any>()` so you can assert on `.create`, `.updateMany`, etc.
 */
export function createPrismaMock(tx: object = {}): PrismaMock {
  return {
    $transaction: vi.fn(async (input: unknown) => {
      if (typeof input === 'function') {
        return (input as (tx: object) => unknown)(tx)
      }
      return input
    })
  } as unknown as PrismaMock
}
