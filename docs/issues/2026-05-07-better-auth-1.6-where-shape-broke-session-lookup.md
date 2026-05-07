# 2026-05-07 — Better Auth 1.6 WHERE-clause shape broke session-token hashing

## Symptom

After signing up via email + password, the user was redirected to `/onboarding`. The page rendered, but submitting the character-creation form produced a 401 on the `character.create` tRPC mutation (`TRPCError: UNAUTHORIZED` from `isAuthed` in `src/server/trpc.ts`). The `AUTH_SIGNUP` and `AUTH_LOGIN` events both logged on the server, so a session row was created in the DB; the cookie was present (the `proxy.ts` optimistic check let the user reach `/onboarding`); but every protected tRPC call afterwards failed authentication.

The same flow worked manually on `2026-05-04` when the session-token hashing extension was first introduced — this regressed silently between then and `2026-05-07`.

## Root cause

A minor version bump of `better-auth` (1.4.18 → 1.6.9, allowed by the `^1.4.17` range in `package.json`) changed the shape of the WHERE clause that `@better-auth/prisma-adapter` passes to Prisma.

| Operation                                      | Better Auth 1.4.x             | Better Auth 1.6.x                         |
| ---------------------------------------------- | ----------------------------- | ----------------------------------------- |
| `findOne` / `findMany` / `deleteMany` by token | `{ where: { token: "raw" } }` | `{ where: { token: { equals: "raw" } } }` |

The change comes from `convertWhereClause` in `@better-auth/prisma-adapter@1.6.9` (`buildSingleCondition`, lines 102-105):

```js
if (w.operator === 'eq' || !w.operator) return { [fieldName]: { equals: w.value, ...modeFilter } }
```

The Prisma extension in `src/server/lib/prisma.ts` only matched the bare-string form:

```ts
const rawToken = typeof args.where?.token === 'string' ? args.where.token : null
```

So `args.where.token` was now an object `{ equals: 'raw' }`, the type check failed, hashing was skipped on lookup, and Prisma searched `WHERE token = 'raw'` while the persisted row stored `sha256('raw')`. No match → `findFirst` returned `null` → `auth.api.getSession()` returned `null` → `createContext` set `user = null` → `isAuthed` threw `UNAUTHORIZED`.

The `create` hook kept working because Better Auth's adapter passes `data: values` directly to `prisma.session.create`, so `args.data.token` is still a raw string. Likewise, `update`-by-id uses `convertWhereClause(action: "update")` which writes `result[fieldName] = w.value` directly (no operator wrapper), so the session-refresh path also kept working. Only the lookup paths broke — the symptom was therefore "you can sign in successfully but every subsequent protected request fails."

This is the same class of bug as `2026-05-04-session-token-hashing-broke-auth.md`: an extension that intercepts an external library's data layer must track the library's wire format, and that format is not part of any stable contract.

## Why the tests didn't catch it

`src/server/__tests__/lib/prisma-session-extension.test.ts` tested the hash-application rules in isolation by re-implementing them in the test file and asserting on `{ where: { token: "raw" } }` shapes. It never exercised the operator-wrapped shape that the real adapter produces. The test author flagged this explicitly in the file header — "Extension wiring is verified manually (sign in, query DB, confirm 64-char hex token)" — and the manual verification stopped catching adapter-shape changes once the version drifted.

## Fix

Updated `src/server/lib/prisma.ts` to introduce a single `hashWhereToken(where)` helper that returns the rewritten WHERE plus a `Map<hashed, raw>` used to restore returned rows. The helper handles three shapes:

- `{ token: "raw" }` — pre-1.6 form, also produced today by Better Auth's `update`-by-id path.
- `{ token: { equals: "raw" } }` — 1.6+ form for `findOne` / `findMany` / `deleteMany`.
- `{ token: { in: [...] } }` — multi-session listing.

Every session hook (`findFirst`, `findMany`, `update`, `delete`, `deleteMany`) now goes through this helper, so any future shape additions are localized to one function. Returned rows are restored via `restoreTokenFromMap(row, map)`, which looks the row's hashed token up in the map produced by the corresponding WHERE rewrite — no more single-`rawToken` parameter that drifted out of sync with the real call shape.

Added unit tests for `{ token: { equals: "raw" } }` and `{ token: { equals, mode } }` shapes alongside the existing string and `{ in: [...] }` cases. These would have caught the 1.4 → 1.6 bump on first run.

## Recovery for affected users

Same recovery as the 2026-05-04 incident: clear the `better-auth.session_token` cookie or sign up again so a fresh cookie is issued. The fix makes existing cookies work _if_ the underlying session row is still in the DB — but since this regression coincided with the email/password migration that included a manual `TRUNCATE sessions`, all dev cookies are dangling and must be replaced regardless.

## Lessons

- A semver-compatible (`^1.4.17`) Better Auth bump silently changed an internal wire format the extension depended on. When wrapping an external library's data layer, treat the library's call shape as an upstream contract you must pin or test against, not infer.
- Logic-level unit tests that re-implement the rule under test prove the rule is internally consistent — they cannot prove the production code is invoked with the inputs the test assumes. Either import the production helper directly into the test, or add an integration-level test that drives the extension with the actual adapter's output.
- "Worked yesterday, broken today" with no code changes in the affected file is a strong signal that a transitive dependency moved. `pnpm-lock.yaml` is the first place to look — a single `git log -p pnpm-lock.yaml | grep <package>` would have surfaced the 1.4.18 → 1.6.9 hop in seconds.
- Pin Better Auth (and any library you've reached into via a Prisma extension or similar shim) to a tilde range — `~1.4.17` instead of `^1.4.17` — until there's an integration test that fails loudly on a wire-format change.
