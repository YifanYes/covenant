# TODOs

## Critical Priority

- [x] Security: Missing Authorization in Repositories
  - `server/repositories/area.repository.ts` (lines 56-71)
  - `server/repositories/objective.repository.ts` (lines 44-70)
  - **Issue:** `update()` and `delete()` methods don't verify userId ownership
  - **Fix:** Added userId parameter to update/delete methods with ownership check

- [x] Security: Character Ownership Not Validated
  - `server/routers/investment.router.ts` - contribute endpoint
  - `server/routers/activity.router.ts` (line 35-39) - join endpoint
  - **Issue:** Endpoints accept characterId without verifying user owns it
  - **Fix:** Added `await verifyCharacterOwnership(input.characterId, ctx.user.id)` before service calls

- [x] Security: getCharacterById Missing Ownership Check
  - `server/services/character.service.ts` (lines 26-28)
  - **Issue:** Returns any character by ID without ownership verification
  - **Fix:** Added optional userId parameter for ownership check

## High Priority

- [x] Security: No Rate Limiting
  - **Fix:** Install `@fastify/rate-limit`, configure for auth (strict) and tRPC (moderate)

- [ ] Security: Database SSL Disabled
  - `server/lib/prisma.ts` (line 14)
  - **Fix:** Change `rejectUnauthorized: false` to `true` in production

- [ ] Security: Cookie Security Production-Only
  - `server/lib/auth.ts` (lines 42-52)
  - **Fix:** Apply secure/sameSite/httpOnly in all environments

- [ ] Security: Session Tokens in Plaintext
  - Prisma schema - Session model
  - **Fix:** Hash tokens with bcrypt before storage

- [x] Combat: Unit Template Mismatch During Hydration
  - `tactical-combat.store.ts:337-341`
  - **Issue:** Missing template silently drops unit, corrupts turn queue
  - **Status:** FIXED - hybrid recovery: player missing → fresh combat, enemy missing → clamp turn index
  - **Fix:** Added player unit guard, turn index clamping, and active unit null guard

## Medium Priority

- [ ] Security: Theme Validation Too Permissive
  - `shared/schemas/auth.schemas.ts` (line 37-39)
  - **Fix:** Use enum validation with valid faction names

- [ ] Security: Error Messages Leak Resource Existence
  - Multiple service files
  - **Fix:** Use generic "Resource not found or access denied" messages

- [ ] Security: Missing DB Indexes
  - `server/prisma/schema.prisma`
  - Tables: Task, Habit, Objective, Area, HabitCompletion
  - **Fix:** Add `@@index([userId])` to these models

- [ ] Security: Client Cookie Missing Secure Flag
  - `front/hooks/use-faction-theme.ts` (lines 51-52)
  - **Fix:** Add `Secure` flag to cookie

- [x] Combat: Memory - Tween Cleanup on Scene Destruction
  - `combat-scene.ts:270-277`, `unit.ts`
  - **Fix:** Create `activeTweens` registry; destroy all on scene shutdown

- [x] Combat: Memory - Particle Emitter Cleanup
  - `combat-scene.ts:510-512, 723-726`
  - **Fix:** Use `once('complete', cleanup)` instead of `delayedCall`

- [x] Combat: Memory - Texture Load Failure
  - `combat-scene.ts:1192-1210`
  - **Fix:** Add error handler `this.load.once('loaderror', ...)`

- [x] Combat: Race - Multiple Animation Flags
  - `combat-scene.ts:24-27`
  - **Fix:** Replace 4 booleans with single `animationType: 'movement' | 'attack' | 'doctrine' | 'status' | null`

## Low Priority

- [ ] Security: No Audit Logging
  - **Fix:** Log auth events (login, session, account changes)

- [ ] Security: No Account Lockout
  - **Fix:** Implement exponential backoff on failed logins

- [ ] Security: Type Safety Issues
  - Multiple `as any` usages
  - **Fix:** Replace with proper types

- [ ] Security: Excessive Console Logging
  - **Fix:** Use structured logging in production

- [x] Combat: God Object CombatService
  - `server/services/combat.service.ts` (was 3100+ lines, now ~380 lines)
  - **Fix:** Split into functional modules in `server/utils/combat/` (dice, movement, doctrine-buffs, attack-resolution, enemy-ai, tactical-doctrine, rewards). CombatService is now a thin orchestrator.

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

## Files to Modify Summary

| File                                              | Changes                                          |
| ------------------------------------------------- | ------------------------------------------------ |
| ~~`server/repositories/area.repository.ts`~~      | ✅ Added userId to update/delete                 |
| ~~`server/repositories/objective.repository.ts`~~ | ✅ Added userId to update/delete                 |
| ~~`server/routers/investment.router.ts`~~         | ✅ Added character ownership check               |
| ~~`server/routers/activity.router.ts`~~           | ✅ Added character ownership check               |
| ~~`server/services/character.service.ts`~~        | ✅ Added userId param to getCharacterById        |
| `server/lib/prisma.ts`                            | Fix SSL validation                               |
| `server/lib/auth.ts`                              | Apply cookie security all envs                   |
| `shared/schemas/auth.schemas.ts`                  | Enum for theme validation                        |
| `server/prisma/schema.prisma`                     | Add userId indexes                               |
| `front/hooks/use-faction-theme.ts`                | Add Secure flag                                  |
| `server/server.ts`                                | Add rate limiting                                |
| `front/stores/tactical-combat.store.ts`           | Fix unit template validation, extract grid utils |
| ~~`front/lib/phaser/scenes/combat-scene.ts`~~      | ✅ Fixed memory/animation issues                 |
| ~~`server/services/combat.service.ts`~~            | ✅ Split into `server/utils/combat/` modules     |
