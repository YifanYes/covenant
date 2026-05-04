# 2026-05-04 — Session token hashing broke authentication

## Symptom

After signing in via magic link, the user was redirected to `/dashboard`. The page rendered a loading state, then the error boundary with `You must be logged in to access this resource`. The browser console showed 401s on the `dashboard.get` tRPC call (`TRPCError: UNAUTHORIZED` from `isAuthed` middleware in `src/server/trpc.ts`). LocalStorage `covenant-store` had a `userId`, so the client believed it was authenticated, but no server request could validate the session cookie.

## Root cause

The Prisma extension added in `src/server/lib/prisma.ts` (per `docs/specs/session_token_hashing.md`) hashed session tokens going **into** the database but never restored the raw token on the way **out**.

Lifecycle of the bug for a single sign-in:

1. Better Auth generates `rawToken` and calls `prisma.session.create({ data: { token: rawToken, ... } })`.
2. The extension hashes the input → DB row stores `sha256(rawToken)`. Good.
3. `query(args)` resolves to the persisted row, whose `token` field is `sha256(rawToken)`. The extension returned this verbatim.
4. Better Auth read `session.session.token` (now the hash) and passed it to `setSessionCookie(...)`. The cookie was signed with the **hashed** value, not the raw token.
5. On the next request, Better Auth strips the signature and calls `findSession(hashedToken)` → `findFirst({ where: { token: hashedToken } })`.
6. The extension hashed it again → looked up `sha256(hashedToken)` → no row matched → `findSession` returned `null` → `createContext` set `user = null` → `isAuthed` threw `UNAUTHORIZED`.

The DB confirmed the diagnosis: recent rows had 64-char hashed tokens (the input-hashing leg worked) while older rows still had 32-char raw tokens (pre-extension). Both classes of rows failed lookup — the new ones because the cookie held a hash that got re-hashed, the old ones because the lookup hashed a raw cookie that no longer matched the raw row.

The spec missed this. It claimed "Better Auth and the rest of the app are unchanged — they continue operating on raw tokens," but Prisma's return values surface the persisted (hashed) value to the caller unless the extension explicitly rewrites them.

## Fix

Updated `src/server/lib/prisma.ts` so each query hook captures the raw token from the input, hashes it for the DB call, then restores the raw token on the returned row:

- `create`, `findFirst`, `update`, `delete` — each scoped to a single raw token, restored via a small `restoreToken(row, rawToken)` helper.
- `findMany` — when filtering by `token` (string or `{ in: [...] }`), build a `hash → raw` map and restore each returned row from it.
- `deleteMany` — returns a count, no restore needed.
- `findMany` without a token filter (e.g. `listSessions` by `userId`) — no raw token in scope, so rows still leak the hashed value to the caller. Acceptable for the auth path; the multi-session-listing flow is not used today and is flagged for future work.

Added unit tests in `src/server/__tests__/lib/prisma-session-extension.test.ts` covering the `restoreToken` helper (raw-token replacement, null pass-through, and the no-raw-token case). The spec at `docs/specs/session_token_hashing.md` was amended with a "Critical: restore the raw token on the way out" subsection so this requirement is explicit.

## Recovery for affected users

Existing browser cookies hold the hashed value, which the fixed code will hash again and never match. Users must either clear the `better-auth.session_token` cookie or request a fresh magic link — clicking it issues a new cookie with the corrected raw value. The spec already calls out optionally truncating `sessions` to drop pre-extension rows.

## Lessons

- A Prisma `query` extension is **bidirectional** in effect even when the explicit code only mutates the input: whatever Prisma returns is the caller's reality. When you transform a column on write, decide on the read-side contract too.
- When intercepting an external library's data layer, walk through one full lifecycle (write → return value → next read) before trusting that the library is "unchanged." The Better Auth flow only became visible by tracing `setSessionCookie` back to where its token argument originated.
- DB inspection is fast triage. Confirming hashed values in `sessions` quickly separated "extension never ran" from "extension ran, lookup logic broken."
