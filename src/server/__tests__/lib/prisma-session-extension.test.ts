/**
 * Tests for the session token hashing logic applied by the Prisma extension.
 * These are logic-level tests of the hash-application rules. Extension wiring
 * is verified manually (sign in, query DB, confirm 64-char hex token).
 */
import { describe, expect, it } from 'vitest'
import { hashSessionToken } from '../../lib/session-token'

function applyCreateHash<T extends { data?: { token?: unknown; [k: string]: unknown } }>(args: T): T {
  if (typeof args.data?.token === 'string') {
    return { ...args, data: { ...args.data, token: hashSessionToken(args.data.token) } }
  }
  return args
}

function applyWhereHash<T extends { where?: { token?: unknown; [k: string]: unknown } }>(args: T): T {
  if (typeof args.where?.token === 'string') {
    return { ...args, where: { ...args.where, token: hashSessionToken(args.where.token as string) } }
  }
  return args
}

function applyWhereInHash<T extends { where?: { token?: { in?: unknown[] } | unknown; [k: string]: unknown } }>(args: T): T {
  const token = args.where?.token
  if (typeof token === 'string') {
    return { ...args, where: { ...args.where, token: hashSessionToken(token) } }
  }
  if (token !== null && typeof token === 'object' && Array.isArray((token as { in?: unknown[] }).in)) {
    const arr = (token as { in: string[] }).in
    return { ...args, where: { ...args.where, token: { ...(token as object), in: arr.map(hashSessionToken) } } }
  }
  return args
}

function restoreToken<T>(row: T, rawToken: string | null): T {
  if (!rawToken || !row || typeof row !== 'object') return row
  if ('token' in row && typeof (row as { token: unknown }).token === 'string') {
    return { ...(row as object), token: rawToken } as T
  }
  return row
}

describe('session create interceptor', () => {
  it('hashes token in data', () => {
    const raw = 'rawtoken123'
    const result = applyCreateHash({ data: { token: raw, userId: 'u1' } })
    expect(result.data!.token).toBe(hashSessionToken(raw))
    expect(result.data!.token).not.toBe(raw)
  })

  it('is a no-op when token is absent', () => {
    const args = { data: { userId: 'u1' } }
    expect(applyCreateHash(args)).toEqual(args)
  })
})

describe('session findFirst / update / delete / deleteMany interceptor', () => {
  it('hashes token in where clause', () => {
    const raw = 'myrawtoken'
    const result = applyWhereHash({ where: { token: raw } })
    expect(result.where!.token).toBe(hashSessionToken(raw))
    expect(result.where!.token).not.toBe(raw)
  })

  it('is a no-op when token is not in where', () => {
    const args = { where: { userId: 'u1' } }
    expect(applyWhereHash(args)).toEqual(args)
  })

  it('is a no-op when where is undefined', () => {
    const args = {}
    expect(applyWhereHash(args)).toEqual(args)
  })
})

describe('session findMany interceptor', () => {
  it('hashes a single string token', () => {
    const raw = 'singletoken'
    const result = applyWhereInHash({ where: { token: raw } })
    expect(result.where!.token).toBe(hashSessionToken(raw))
  })

  it('hashes every token in an { in: [...] } filter (findSessions path)', () => {
    const tokens = ['tok1', 'tok2', 'tok3']
    const result = applyWhereInHash({ where: { token: { in: tokens } } })
    const tokenResult = result.where!.token as { in: string[] }
    expect(tokenResult.in).toEqual(tokens.map(hashSessionToken))
    expect(tokenResult.in).not.toContain(tokens[0])
  })

  it('is a no-op when where has no token field', () => {
    const args = { where: { userId: 'u1' } }
    expect(applyWhereInHash(args)).toEqual(args)
  })

  it('is a no-op when where is undefined', () => {
    const args = {}
    expect(applyWhereInHash(args)).toEqual(args)
  })
})

describe('returned-row token restoration', () => {
  it('replaces the stored hashed token with the raw input token', () => {
    const raw = 'raw-token-from-input'
    const row = { id: 's1', userId: 'u1', token: hashSessionToken(raw), expiresAt: new Date() }
    expect(restoreToken(row, raw).token).toBe(raw)
  })

  it('passes through null results unchanged (e.g. findFirst miss)', () => {
    expect(restoreToken(null, 'raw')).toBeNull()
  })

  it('does nothing when no raw token was supplied (e.g. lookup by userId)', () => {
    const row = { id: 's1', token: 'hashed-value' }
    expect(restoreToken(row, null)).toBe(row)
  })
})
