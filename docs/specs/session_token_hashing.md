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

Better Auth v1.4.18 session lifecycle (confirmed in `node_modules/better-auth/dist/db/internal-adapter.mjs` and `node_modules/better-auth/dist/adapters/prisma-adapter/prisma-adapter.mjs`):

1. Generates `token = generateId(32)` (random, ~192-bit)
2. Stores via `prisma.session.create({ data: { token, ... } })`
3. Sends raw token in a cookie to the client
4. On each request: reads token from cookie, queries `prisma.session.findFirst({ where: { token: cookieValue } })`
5. On session rolling (expiry extension): calls `updateSession(token, ...)` which issues `prisma.session.update({ where: { token }, data: ... })`
6. For session listing (`findSessions`): issues `prisma.session.findMany({ where: { token: { in: [...] } } })`
7. Also queries by token for `delete` and `deleteMany` (sign-out, session revocation)

The Prisma adapter's `findOne` call translates to Prisma's `findFirst` (not `findUnique`).

## Implementation

Use a **Prisma Client Extension** (query component) on the `session` model. The extension intercepts all operations that touch `token` and applies SHA-256 before any SQL executes. Better Auth and the rest of the app are unchanged — they continue operating on raw tokens.

No schema migration is needed. SHA-256 hex output is always 64 chars, which fits the existing `String` column.

### Critical: restore the raw token on the way out

Hashing the input is only half the contract. Prisma returns the row that was written, so a `create` whose input was hashed returns a row whose `token` is the hash. Better Auth then reads `session.session.token` and writes it into the session cookie via `setSessionCookie(..., session.session.token, ...)`. On the next request, the cookie holds the hashed value; the `findFirst` interceptor hashes it a second time and the lookup never matches — every request after sign-in 401s.

The extension must therefore restore the raw token on the returned row for every operation that has a raw token in scope:

- `create({ data })` — capture `data.token`, hash it for the write, restore the raw value on the returned row.
- `findFirst({ where })` — capture `where.token`, hash it for the lookup, restore the raw value on the returned row (caller's input == row's stored value, so they're interchangeable from the caller's perspective).
- `update({ where })` — same pattern as `findFirst`. Better Auth's session-rolling path uses the returned row's `token` to refresh the cookie, so this restoration is what keeps cookies stable across `updateAge` rolls.
- `delete({ where })` — same pattern (Better Auth ignores the return, but restore for consistency).
- `findMany({ where })` — when `where.token` is a string or `{ in: [...] }`, build a `hash → raw` map and restore each returned row from it.
- `deleteMany` — returns a count; nothing to restore.
- `findMany` without a token filter (e.g. listing by `userId`) — no raw token in scope, so rows leak the hashed value to the caller. This breaks `listSessions` / multi-session revocation flows; out of scope for this spec, but flag for the future.

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

// Store the base client in global — not the extended variant — to avoid double-extension on hot-reload.
const baseClient = globalForPrisma.prisma || new PrismaClient({ adapter })

if (env.NODE_ENV !== 'production') globalForPrisma.prisma = baseClient

// Restore the raw token on a returned row so callers (better-auth) keep operating on raw tokens.
// Without this, the hashed value leaks back out via session.token and gets written to the cookie,
// breaking the next request because the cookie's hashed value gets hashed again on lookup.
function restoreToken<T>(row: T, rawToken: string | null): T {
  if (!rawToken || !row || typeof row !== 'object') return row
  if ('token' in row && typeof (row as { token: unknown }).token === 'string') {
    return { ...(row as object), token: rawToken } as T
  }
  return row
}

const sessionHashExtension = Prisma.defineExtension({
  name: 'session-token-hash',
  query: {
    session: {
      async create({ args, query }) {
        const rawToken = typeof args.data?.token === 'string' ? args.data.token : null
        if (rawToken) {
          args.data = { ...args.data, token: hashSessionToken(rawToken) }
        }
        const result = await query(args)
        return restoreToken(result, rawToken)
      },
      async findFirst({ args, query }) {
        const rawToken = typeof args.where?.token === 'string' ? args.where.token : null
        if (rawToken) {
          args.where = { ...args.where, token: hashSessionToken(rawToken) }
        }
        const result = await query(args)
        return restoreToken(result, rawToken)
      },
      async findMany({ args, query }) {
        const token = args.where?.token
        let restoreMap: Map<string, string> | null = null
        if (typeof token === 'string') {
          const hashed = hashSessionToken(token)
          args.where = { ...args.where, token: hashed }
          restoreMap = new Map([[hashed, token]])
        } else if (token !== null && typeof token === 'object' && Array.isArray(token.in)) {
          // better-auth's findSessions passes { token: { in: [...] } } — hash each element
          restoreMap = new Map()
          const hashedIn = token.in.map((t: string) => {
            const h = hashSessionToken(t)
            restoreMap!.set(h, t)
            return h
          })
          args.where = { ...args.where, token: { ...token, in: hashedIn } }
        }
        const result = await query(args)
        if (Array.isArray(result) && restoreMap) {
          return result.map((row) => {
            if (
              row &&
              typeof row === 'object' &&
              'token' in row &&
              typeof (row as { token: unknown }).token === 'string'
            ) {
              const raw = restoreMap!.get((row as { token: string }).token)
              if (raw) return { ...(row as object), token: raw }
            }
            return row
          })
        }
        return result
      },
      async update({ args, query }) {
        // better-auth's updateSession uses WHERE token = ? (not by id)
        const rawToken = typeof args.where?.token === 'string' ? args.where.token : null
        if (rawToken) {
          args.where = { ...args.where, token: hashSessionToken(rawToken) }
        }
        const result = await query(args)
        return restoreToken(result, rawToken)
      },
      async delete({ args, query }) {
        const rawToken = typeof args.where?.token === 'string' ? args.where.token : null
        if (rawToken) {
          args.where = { ...args.where, token: hashSessionToken(rawToken) }
        }
        const result = await query(args)
        return restoreToken(result, rawToken)
      },
      async deleteMany({ args, query }) {
        if (typeof args.where?.token === 'string') {
          args.where = { ...args.where, token: hashSessionToken(args.where.token) }
        }
        return query(args)
      }
    }
  }
})

// $extends returns a subtype TypeScript won't accept as PrismaClient without a cast.
// The runtime shape is fully compatible — all repository and service operations work unchanged.
export const prisma = baseClient.$extends(sessionHashExtension) as unknown as PrismaClient
```

**Operations intercepted:**

| Operation    | Hashes input on                | Restores raw token in result                          |
| ------------ | ------------------------------ | ----------------------------------------------------- |
| `create`     | `data.token`                   | the returned row                                      |
| `findFirst`  | `where.token`                  | the returned row                                      |
| `findMany`   | `where.token` (string or `in`) | each row, mapped back via `hash → raw`                |
| `update`     | `where.token`                  | the returned row (used by Better Auth's session roll) |
| `delete`     | `where.token`                  | the returned row (Better Auth ignores it)             |
| `deleteMany` | `where.token`                  | n/a — returns a count                                 |

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
    expect(hashSessionToken('test')).toBe('9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08')
  })
})
```

### `src/server/__tests__/lib/prisma-session-extension.test.ts`

Logic-level tests for the hash-application rules (create, where-string, where-in). Extension wiring is verified manually via the steps in **Verification** below.

See the file for full coverage including: `create` data hashing, `findFirst`/`update`/`delete`/`deleteMany` where-string hashing, `findMany` with `{ in: [...] }` filter hashing, and no-op cases.

## Migration

**Existing sessions are all invalidated on deploy.** The DB stores plaintext tokens; after deploy, lookups hash the cookie token before querying — no existing row matches. Users are signed out once and must re-authenticate.

- No schema migration needed
- Optionally clear stale rows before deploy: `DELETE FROM sessions;`
- **Rollback warning**: if the code is reverted after deploy, the DB contains hashed tokens but the reverted code does raw-token lookups — all sessions appear invalid and no one can authenticate until the sessions table is cleared. Clear the table on both deploy and any rollback that follows a deploy.

## Verification

1. `pnpm test` — all tests pass including new ones
2. `tsc --noEmit` — no type errors
3. Sign in via magic link or Google OAuth
4. Query DB: `SELECT token FROM sessions LIMIT 1;` — should be a 64-char lowercase hex string
5. Make an authenticated API request — session validation succeeds
6. Sign out — re-sign in succeeds (confirms `delete` + `create` paths)
7. Trigger a session listing (e.g. active sessions UI) — sessions appear correctly (confirms `findMany` + `in` path)
