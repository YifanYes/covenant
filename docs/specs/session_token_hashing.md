# Session Token Hashing

## Problem

Session tokens are stored as plaintext in the `sessions` table (`token String @unique`). If the database is compromised, an attacker can extract all tokens and immediately impersonate every active user — no cracking required.

## Why SHA-256, Not bcrypt

The todo item specifies bcrypt, but bcrypt is wrong for this use case.

bcrypt is intentionally **non-deterministic** — `bcrypt.hash("token")` produces a different output every call because a random salt is embedded in the result. This is exactly what you want for passwords (prevents rainbow tables), but it makes database lookup by token impossible: after storing `bcrypt.hash(token)`, there is no way to retrieve the session with `WHERE token = bcrypt.hash(cookieToken)` because the two hashes will never match.

SHA-256 is the correct tool:

- **Deterministic**: `sha256("token")` always returns the same 64-char hex string
- **One-way**: given the hash, the original token cannot be recovered
- **No new dependency**: built into Node.js via `node:crypto`
- **Appropriate entropy**: session tokens are already 32-char cryptographically random strings (~192 bits of entropy), so a salt adds nothing — rainbow tables are infeasible regardless

## How Better Auth Uses Session Tokens

Better Auth v1.4.18 session lifecycle (confirmed in `node_modules/better-auth/dist/db/internal-adapter.mjs` and `prisma-adapter.mjs`):

1. Generates `token = generateId(32)` (random, ~192-bit)
2. Stores via `prisma.session.create({ data: { token, ... } })`
3. Sends raw token in a cookie to the client
4. On each request: reads token from cookie, queries `prisma.session.findFirst({ where: { token: cookieValue } })`
5. Also queries by token for `delete` and `deleteMany` (sign-out, session revocation)

The Prisma adapter always uses `findFirst` (not `findUnique`) for session token lookups.

## Implementation

Use a **Prisma Client Extension** (query component) on the `session` model. The extension intercepts all operations that touch `token` and applies SHA-256 before any SQL executes. Better Auth and the rest of the app are unchanged — they continue operating on raw tokens.

No schema migration is needed. SHA-256 hex output is always 64 chars, which fits the existing `String` column.

### New file: `src/server/lib/session-token.ts`

```typescript
import { createHash } from 'node:crypto'

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}
```

### Modified: `src/server/lib/prisma.ts`

Add the extension after constructing the base client. Store the **base** client in `globalForPrisma` (not the extended variant) to avoid double-extension on hot-reload in development.

```typescript
import { Prisma, PrismaClient } from '@/generated/prisma'
import { hashSessionToken } from './session-token'

// ... existing pool/adapter construction unchanged ...

const baseClient = globalForPrisma.prisma || new PrismaClient({ adapter })

if (env.NODE_ENV !== 'production') globalForPrisma.prisma = baseClient

const sessionHashExtension = Prisma.defineExtension({
  name: 'session-token-hash',
  query: {
    session: {
      async create({ args, query }) {
        if (typeof args.data?.token === 'string') {
          args.data = { ...args.data, token: hashSessionToken(args.data.token) }
        }
        return query(args)
      },
      async findFirst({ args, query }) {
        if (typeof args.where?.token === 'string') {
          args.where = { ...args.where, token: hashSessionToken(args.where.token) }
        }
        return query(args)
      },
      async findMany({ args, query }) {
        if (typeof args.where?.token === 'string') {
          args.where = { ...args.where, token: hashSessionToken(args.where.token) }
        }
        return query(args)
      },
      async delete({ args, query }) {
        if (typeof args.where?.token === 'string') {
          args.where = { ...args.where, token: hashSessionToken(args.where.token) }
        }
        return query(args)
      },
      async deleteMany({ args, query }) {
        const where = args.where as { token?: unknown } | undefined
        if (typeof where?.token === 'string') {
          args.where = { ...args.where, token: hashSessionToken(where.token) }
        }
        return query(args)
      },
    },
  },
})

// $extends returns a subtype that TypeScript doesn't accept as PrismaClient without a cast.
// The runtime shape is fully compatible — all repository/service operations work unchanged.
export const prisma = baseClient.$extends(sessionHashExtension) as unknown as PrismaClient
```

**Operations intercepted:**

| Operation | Why |
|-----------|-----|
| `create` | Hash before insert |
| `findFirst` | Hash before lookup (primary session validation path) |
| `findMany` | Hash before lookup (session listing) |
| `delete` | Hash before sign-out lookup |
| `deleteMany` | Hash before bulk revocation |

`update` and `updateMany` are **not** intercepted — Better Auth updates sessions by `id`, never by `token`.

## Tests

### `src/server/__tests__/lib/session-token.test.ts`

Pure unit tests for the hash utility:

```typescript
import { describe, expect, it } from 'vitest'
import { hashSessionToken } from '../../lib/session-token'

describe('hashSessionToken', () => {
  it('returns a 64-character hex string', () => {
    const hash = hashSessionToken('sometoken')
    expect(hash).toHaveLength(64)
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('is deterministic', () => {
    const token = 'abc123xyz'
    expect(hashSessionToken(token)).toBe(hashSessionToken(token))
  })

  it('produces different hashes for different tokens', () => {
    expect(hashSessionToken('token-a')).not.toBe(hashSessionToken('token-b'))
  })

  it('matches known SHA-256 digest', () => {
    expect(hashSessionToken('test')).toBe(
      '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08'
    )
  })
})
```

### `src/server/__tests__/lib/prisma-session-extension.test.ts`

Tests for the interceptor logic without a real Prisma client:

```typescript
import { describe, expect, it } from 'vitest'
import { hashSessionToken } from '../../lib/session-token'

function applyCreateHash<T extends { data?: { token?: unknown } }>(args: T): T {
  if (typeof args.data?.token === 'string') {
    return { ...args, data: { ...args.data, token: hashSessionToken(args.data.token) } }
  }
  return args
}

function applyWhereHash<T extends { where?: { token?: unknown } }>(args: T): T {
  if (typeof args.where?.token === 'string') {
    return { ...args, where: { ...args.where, token: hashSessionToken(args.where.token as string) } }
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

describe('session find/delete interceptor', () => {
  it('hashes token in where clause', () => {
    const raw = 'myrawtoken'
    const result = applyWhereHash({ where: { token: raw } })
    expect(result.where!.token).toBe(hashSessionToken(raw))
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
```

## Migration

**Existing sessions are all invalidated on deploy.** The DB stores plaintext tokens; after deploy, lookups hash the cookie token before querying — no existing row matches. Users are signed out once and must re-authenticate.

- No schema migration needed
- Optionally clear stale rows before deploy: `DELETE FROM sessions;`
- No rollback needed for the schema; if reverting the code, tokens become plaintext again (which is no worse than the current state)

## Verification

1. `pnpm test` — all tests pass including new ones
2. `tsc --noEmit` — no type errors
3. Sign in via magic link or Google OAuth
4. Query DB: `SELECT token FROM sessions LIMIT 1;` — should be a 64-char lowercase hex string
5. Make an authenticated API request — session validation succeeds
