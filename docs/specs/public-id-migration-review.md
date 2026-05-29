# Public ID Migration — Code Review Findings

Review of the uuid → BigInt PK + `publicId` migration covering 146 modified files. Server keeps internal BigInt PKs and exposes 12-char alphanumeric `publicId` on API surfaces. `superjson` transformer wired on both tRPC server (`src/server/trpc.ts`) and client (`src/utils/trpc.utils.ts`) for BigInt serialization. Most of the migration is consistent; remaining defects are concentrated at client/server edges where the UI still passes BigInts to fields validated as `publicIdSchema`.

## Summary Table

| Severity | Count |
|----------|-------|
| critical | 0 |
| high     | 4 |
| medium   | 7 |
| low      | 5 |
| nit      | 3 |

**Verdict:** ship with fixes. Four high-severity items are client-side regressions that break feature flows; fix those before merging. Mediums are follow-up cleanup.

**Resolution (this PR):** H1–H4 and M1–M6 fixed. M7 reframed as a security-hygiene task and **deferred** to its own scoped change (see M7). Lows/nits untouched. `pnpm typecheck` clean; 498/498 unit tests pass.

---

## High

### H1. Habit objectives schema rejects publicIds

- **Location:** `src/shared/schemas/habits.schemas.ts:14,18`
- **Issue:** `objectives: z.array(bigintIdSchema)` — `bigintIdSchema` regex is `^\d+$`. UI sends `objective.publicId` (`src/app/(workspace)/habits/_components/update-habit-dialog.component.tsx:67`), which is `[a-z][a-z0-9]{11}`. Validation fails. Habit save with any linked objective returns 422.
- **Fix:**
  - `habits.schemas.ts`: change `objectives` array element type to `publicIdSchema`.
  - `src/server/repositories/habit.repository.ts:36,105`: change `connect`/`set` from `{ id: objectiveId }` to `{ publicId }` (mirroring how `areas` already works).

### H2. Update-task SingleSelect writes BigInt into publicId field

- **Location:** `src/app/(workspace)/tasks/_components/update-task-dialog.component.tsx:168-178`
- **Issue:** SingleSelect bound to `statusPublicId` (validated by `publicIdSchema`), but options use `value: String(status.id)` and `onChange={(v) => field.onChange(v != null ? BigInt(v) : v)}`. Selecting a status writes a stringified BigInt into a publicId field → schema fails.
- **Fix:**
  ```tsx
  options={statusesData.statuses.map((status) => ({
    value: status.publicId,
    label: t(`task_status.${status.label}` as Parameters<typeof t>[0], { defaultValue: status.label })
  }))}
  onChange={field.onChange}
  ```

### H3. Task board columns keyed by BigInt, not publicId

- **Location:** `src/app/(workspace)/tasks/_components/task-kanban.component.tsx:57-58`, `src/app/(workspace)/tasks/_components/tasks-list-board.component.tsx:58-59`
- **Issue:** `<TaskList id={String(status.id)} />` passes a bigint-stringified id, but `TaskList` resolves `tasks?.[id]` against a map keyed by `statusPublicId` (see `task.service.ts:48-58`). All columns render empty. Drag-end (`task-list.component.tsx:60`) writes `statusPublicId: targetId` where `targetId` is the bigint string, breaking `bulkUpdate` validation downstream.
- **Fix:** pass `status.publicId` instead of `String(status.id)` in both boards.

### H4. `public-id.ts` docstring regex/length out of sync

- **Location:** `src/server/lib/public-id.ts:7-10`
- **Issue:** Comment claims regex `^[a-z][a-z0-9]{23}$` (24 chars) and "~62 bits of entropy across 26 letters + 10 digits". Actual `publicIdSchema` (`src/shared/schemas/ids.schemas.ts:9`) is `^[a-z][a-z0-9]{11}$` (12 chars) and `PUBLIC_ID_LENGTH = 12`. Misleading docs invite future drift.
- **Fix:** correct the regex and entropy figure (12 chars × log2(36) ≈ 62 bits is right; the regex length is wrong).

---

## Medium

### M1. Chat cursor silently restarts on missing cursor row

- **Location:** `src/server/repositories/guild-message.repository.ts:32-46`, `src/server/repositories/tavern-message.repository.ts:30-44`
- **Issue:** When the cursor `publicId` cannot be resolved (deleted message, bad cursor), `cursorWhere` stays `undefined` and the query returns the newest page — infinite scroll restarts from the top instead of erroring or returning empty.
- **Fix:** if `cursorRow` is null, return `[]` (cursor exhausted) or throw `BAD_REQUEST`. Add a `log.warn`.

### M2. N+1 lookup in active-quest reads

- **Location:** `src/server/services/quest.service.ts:289,316-319`
- **Issue:** `getActiveQuest` and `getAvailableQuests` call `findActiveByCharacterId(...)` and then a second `findById(quest.id)` solely to read `publicId`.
- **Fix:** include `publicId` in `findActiveByCharacterId` return shape; drop the second query.

### M3. Repeated status lookups in task service

- **Location:** `src/server/services/task.service.ts:48-58,103-115,135-145`
- **Issue:** `getAll`, `getFiltered`, `getDueOnDate` each re-fetch `userTaskStatusRepository.findAll(userId)` solely to map `statusId → publicId` for the response.
- **Fix:** either include `{ status: { select: { publicId: true } } }` in the Prisma include, or cache per request via `DataLoader` / context-scoped memo.

### M4. Journal write path does three DB roundtrips

- **Location:** `src/server/repositories/journal.repository.ts:33-50`
- **Issue:** Service-level `resolve(publicId, userId)` does a read; then `journal.repository.update` runs `findByIdOrThrow` internally; then the actual write. Three roundtrips per update / soft delete.
- **Fix:** drop the in-repo `findByIdOrThrow`; use `updateMany where: { id, userId }` and assert `result.count === 1`.

### M5. Advisory lock keyspace narrowed by BigInt stringification

- **Location:** `src/server/services/combat.service.ts:286`
- **Issue:** `pg_advisory_xact_lock(hashtext(${questId.toString()}))`. UUID strings had ~122 bits of entropy fed to `hashtext`; BigInt decimal strings for small IDs collide noticeably more often, especially across users.
- **Fix:** pass the BigInt as a native param: `pg_advisory_xact_lock(${questId})` (postgres `bigint` overload). Removes the `hashtext` collision entirely.

### M6. Silent legacy-state skip in combat rewards

- **Location:** `src/server/utils/combat/rewards.ts:69`
- **Issue:** `if (enemyUnit && /^\d+$/.test(enemyUnit.id))` quietly skips enemy lookup for legacy tactical states where `enemyUnit.id` is still a UUID string. Behavior is correct but invisible.
- **Fix:** add `log.warn({ enemyId: enemyUnit.id }, 'rewards: legacy non-numeric enemy id, skipping lookup')` so the migration tail is observable.

### M7. DTO mapping only in AreaService — DEFERRED to a separate security task

- **Location:** `src/server/services/area.service.ts:6-22` (`toDTO`)
- **Issue:** `AreaService` introduces an explicit `toDTO` that strips BigInt `id` and `userId`; every other service returns Prisma rows directly. Inconsistent API contract — clients see different shapes per resource.
- **Security follow-up (why this is more than cosmetics):** the leaked `userId` is the **better-auth `User.id`**. It is an identifier, not a credential (sessions are cookie-based), so this is disclosure/hygiene, not takeover. Two cases:
  - *Own* userId in `task`/`habit`/`journal` responses and the `covenant-store` localStorage (`auth.store.ts`, cleared on `signOut`) — **low risk**, standard practice, cosmetic to trim.
  - *Other users'* userId in **guild/tavern chat** — every message author's better-auth id (row `userId` + selected `user.id`) ships to all room members. **Low-to-medium**: no IDOR today (authz is session-derived, resources addressed by `publicId`/`slug`), ids are random (not enumerable), but it is needless exposure of an internal auth identifier to third parties.
- **Why it isn't a mechanical `Omit`:** the client computes ownership client-side from the leaked id — `tavern-room.component.tsx:83` (`msg.userId === myUserId`) and `member-list.component.tsx:120` (`member.userId === myUserId`). Stripping `userId` would break the delete button and "is me" markers.
- **Scoped fix (separate task):**
  1. Server computes `isMine`/`isAuthor` against the session user; return that boolean instead of `userId`.
  2. Strip `userId` + `user.id` from chat/member responses; expose only character identity (`slug`/`name`).
  3. (Cosmetic) strip `userId` from own-resource responses (`task`/`habit`/`journal`) — safe, `models.types` never references it.
  4. Audit: confirm no tRPC procedure trusts a client-supplied `userId` for authorization.

---

## Low

### L1. Slug exhaustion throws generic Error

- **Location:** `src/server/lib/slug.ts:50`
- **Issue:** After `MAX_SLUG_ATTEMPTS`, throws bare `Error`. Bubbles up as `INTERNAL_SERVER_ERROR` to clients in `guild.service.ts:107` and `character.repository.ts:145`.
- **Fix:** throw `new TRPCError({ code: 'CONFLICT', message: 'Could not generate unique slug' })`.

### L2. MultiSelect default generic is wrong

- **Location:** `src/components/forms/multi-select.component.tsx:7-10`
- **Issue:** `TItemId extends bigint | string = bigint`. Post-migration every call site passes publicId strings; the default of `bigint` is misleading and may swallow type errors.
- **Fix:** change default to `string`.

### L3. Duplicate `findBySlug*` methods in character repo

- **Location:** `src/server/repositories/character.repository.ts:62-72`
- **Issue:** `findBySlug` and `findBySlugWithClasses` differ only in the `include`.
- **Fix:** collapse to one method with an `includeClasses` flag, or keep only the one services call.

### L4. Redundant prev-lookup in task bulkUpdate

- **Location:** `src/server/services/task.service.ts:198-209`
- **Issue:** Build loop validates `prev` and pushes into `resolved`; the next `flatMap` re-`get`s the same row by `publicId`.
- **Fix:** include `impact` / `prevStatusId` in the `resolved` entries directly.

### L5. Status lookup in duplicate path

- **Location:** `src/server/services/task.service.ts:268-279`
- **Issue:** `duplicate` calls `userTaskStatusRepository.findAll` only to map the original `statusId` → `publicId` for the create input. Wasteful.
- **Fix:** add `findById(bigint, userId)` on the status repo, or accept the inverted shape (pass `statusId` directly into a lower-level `taskRepository.create` overload).

---

## Nit

### N1. Sidebar formatting mixed with migration

- **Location:** `src/components/common/app-sidebar.component.tsx`
- **Issue:** Pure formatting changes (import unwrap, attribute reflow, `cursor-pointer` add) bundled with the migration diff. Noise during review.
- **Fix:** split into a separate commit.

### N2. `isPrismaUniqueViolationOn` substring branch

- **Location:** `src/server/lib/prisma-errors.ts:12-18`
- **Issue:** `typeof target === 'string' ? target.includes(field)` can substring-match (`field='id'` inside `'publicId'`). Modern Prisma `meta.target` is always `string[]`; the string branch is effectively dead and dangerous.
- **Fix:** drop the string branch, or require exact equality.

### N3. Draft publicId synthetic format

- **Location:** `src/app/(workspace)/tasks/_components/task-statuses-section.component.tsx:308`
- **Issue:** `publicId: \`draft-${Date.now()}-${...}\`` is only safe because `diffStatuses` filters drafts via `isNew` before they hit `publicIdSchema`. Comment is already there — keep it; consider an `invariant` to fail loudly if a draft ever reaches the update/delete branches.

---

## Touched-but-Clean

The following migration surfaces were reviewed and are correct as written:

- `src/server/trpc.ts` + `src/utils/trpc.utils.ts` — superjson on both ends; BigInt round-trips.
- `prisma/manual/seed-dashboard.sql` — `gen_random_uuid()` removed; uses `RETURNING id INTO new_id` with `bigint[]` accumulators. Order of population (`area_ids` filled before `_AreaToObjective` reads) holds.
- `src/server/repositories/base.repository.ts` — generic constraints flipped to `{ id: bigint }`.
- `src/server/services/guild.service.ts` — `createWithUniqueSlug` wraps the create+member transaction; `P2002` mapping centralised in `prisma-errors.ts`.
- `src/server/repositories/task.repository.ts` `findByPublicId`, ownership filter via `task.userId !== userId` — consistent pattern across repos.
