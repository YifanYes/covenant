# TODOs

## Critical Priority

- [ ]

## High Priority

- [ ] Hacer que el token de autenticación nunca expire.

- [ ] Simple feature flag
  - Enable controlled rollout of new features without redeployments

- [ ] Observability
  - Logging, metrics, and tracing for backend services and frontend errors

## Medium Priority

- [ ] Post-its board / card view in productivity section
  - Kanban-style card view as an alternative layout for tasks in the productivity area

- [ ] Journaling module
  - Daily/free-form journal entries linked to tasks, habits, and quests

- [ ] Automatic inference of area
  - Infer task/habit area from content using heuristics or AI classification

- [ ] Security: Error Messages Leak Resource Existence
  - Multiple service files
  - **Fix:** Use generic "Resource not found or access denied" messages

- [ ] Conversation type quests: it's a dialog where you choose between different choices, each one has a different outcome.

## Low Priority

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

- [ ] AI report of the month
  - Monthly AI-generated summary of user productivity, habit streaks, and progress toward objectives

- [ ] Combat: Race - Async State Access
  - `use-tactical-enemy-turn.hook.ts:34`
  - **Fix:** Refresh state after each await in critical paths
