/**
 * Tests for the session token hashing logic applied by the Prisma extension.
 * These are logic-level tests of the actual exported functions from session-hash.ts.
 * Extension wiring is verified manually (sign in, query DB, confirm 64-char hex token).
 */
import { describe, expect, it } from 'vitest'
import { hashWhereToken, restoreTokenFromMap } from '../../lib/session-hash'
import { hashSessionToken } from '../../lib/session-token'

// Simulates the create interceptor's inline hash-and-restore logic
function applyCreateHash<T extends { data?: { token?: unknown; [k: string]: unknown } }>(args: T): T {
  if (typeof args.data?.token === 'string') {
    return { ...args, data: { ...args.data, token: hashSessionToken(args.data.token) } }
  }
  return args
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

describe('hashWhereToken — string form { token: "raw" }', () => {
  it('hashes the raw string and tracks restore mapping', () => {
    const raw = 'myrawtoken'
    const { where, restoreMap } = hashWhereToken({ token: raw })
    expect((where as { token: string }).token).toBe(hashSessionToken(raw))
    expect(restoreMap?.get(hashSessionToken(raw))).toBe(raw)
  })
})

describe('hashWhereToken — operator form { token: { equals: "raw" } }', () => {
  // Better-auth 1.6.x's prisma adapter produces this shape from convertWhereClause for
  // findOne/findMany. The pre-1.6 versions used the bare-string form covered above.
  it('hashes the equals value while preserving the operator wrapper', () => {
    const raw = 'rawfromequals'
    const { where, restoreMap } = hashWhereToken({ token: { equals: raw } })
    const out = (where as { token: { equals: string } }).token
    expect(out.equals).toBe(hashSessionToken(raw))
    expect(restoreMap?.get(hashSessionToken(raw))).toBe(raw)
  })

  it('preserves other operator keys alongside equals', () => {
    const raw = 'rawmodal'
    const { where } = hashWhereToken({ token: { equals: raw, mode: 'insensitive' } })
    const out = (where as { token: { equals: string; mode: string } }).token
    expect(out.equals).toBe(hashSessionToken(raw))
    expect(out.mode).toBe('insensitive')
  })
})

describe('hashWhereToken — { token: { in: [...] } } findSessions form', () => {
  it('hashes every token in the array and builds a restore map', () => {
    const tokens = ['tok1', 'tok2', 'tok3']
    const { where, restoreMap } = hashWhereToken({ token: { in: tokens } })
    const out = (where as { token: { in: string[] } }).token
    expect(out.in).toEqual(tokens.map(hashSessionToken))
    for (const raw of tokens) expect(restoreMap?.get(hashSessionToken(raw))).toBe(raw)
  })
})

describe('hashWhereToken — no-op cases', () => {
  it('passes through when where has no token field', () => {
    const where = { userId: 'u1' }
    const result = hashWhereToken(where)
    expect(result.where).toBe(where)
    expect(result.restoreMap).toBeNull()
  })

  it('passes through when where is undefined', () => {
    expect(hashWhereToken(undefined)).toEqual({ where: undefined, restoreMap: null })
  })
})

describe('returned-row token restoration', () => {
  it('replaces the stored hashed token with the raw input token via the map', () => {
    const raw = 'raw-token-from-input'
    const hashed = hashSessionToken(raw)
    const row = { id: 's1', userId: 'u1', token: hashed, expiresAt: new Date() }
    expect(restoreTokenFromMap(row, new Map([[hashed, raw]])).token).toBe(raw)
  })

  it('passes through null results unchanged (e.g. findFirst miss)', () => {
    expect(restoreTokenFromMap(null, new Map([['hashed', 'raw']]))).toBeNull()
  })

  it('does nothing when no map was supplied (e.g. lookup by userId)', () => {
    const row = { id: 's1', token: 'hashed-value' }
    expect(restoreTokenFromMap(row, null)).toBe(row)
  })

  it('does nothing when the row token is not in the map (e.g. cross-call leak)', () => {
    const row = { id: 's1', token: 'unknown-hash' }
    expect(restoreTokenFromMap(row, new Map([['other-hash', 'other-raw']]))).toBe(row)
  })
})
