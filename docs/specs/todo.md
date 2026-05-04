# TODOs

## Critical Priority

- [ ] Update landing page with trimmed functionality.

## High Priority

- [ ] Security: Cookie Security Production-Only
  - `server/lib/auth.ts` (lines 42-52)
  - **Fix:** Apply secure/sameSite/httpOnly in all environments. Implement the spec in `/docs/specs/session_token_hashing.md`.

- [ ] Security: Session Tokens in Plaintext
  - Prisma schema - Session model
  - **Fix:** Hash tokens with bcrypt before storage

## Medium Priority

- [ ] Security: Error Messages Leak Resource Existence
  - Multiple service files
  - **Fix:** Use generic "Resource not found or access denied" messages

## Low Priority

- [ ] Security: No Audit Logging
  - **Fix:** Log auth events (login, session, account changes)

- [ ] Security: No Account Lockout
  - **Fix:** Implement exponential backoff on failed logins

- [ ] Security: Type Safety Issues
  - Multiple `as any` usages
  - **Fix:** Replace with proper types

- [ ] Combat: Duplicated Grid Logic
  - `tactical-combat.store.ts:1025-1040, 1453-1468, 156-180`
  - **Fix:** Extract to `shared/utils/grid.utils.ts`

- [ ] Combat: Magic Numbers
  - Various files with hardcoded dice values
  - **Fix:** Move to `shared/constants/combat-rules.ts`

- [ ] Combat: Race - Enemy Turn Guard
  - `use-tactical-enemy-turn.hook.ts:29-31`
  - **Fix:** Use state flag + ref together; debounce effect

- [ ] Combat: Race - Async State Access
  - `use-tactical-enemy-turn.hook.ts:34`
  - **Fix:** Refresh state after each await in critical paths
