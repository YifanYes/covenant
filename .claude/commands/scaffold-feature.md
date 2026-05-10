# Scaffold Feature

Add a feature end-to-end across the Covenant stack following the `AGENTS.md` recipe. Pause to confirm with the user when scope, entity name, or route group is ambiguous.

## Pre-flight

1. Ask the user for: feature name (kebab-case), entity name (PascalCase singular), one-line summary, target route group (`(workspace)` | `(auth)` | `(landing)`).
2. Check `roadmap.md` for phase priorities — flag if the feature is not on the roadmap.
3. Check `docs/specs/` — if no spec exists, ask whether to draft one first (SDD is a project pillar).

## Backend

Order matters. Each step names an existing pattern to mirror so naming, layering, and exports stay consistent.

### 1. Zod schema

- File: `src/shared/schemas/<entity>.schema.ts`
- Export input/output schemas. Derive types via `z.infer<typeof schema>` — never declare them by hand.
- Mirror an existing schema: see `src/shared/schemas/habit.schema.ts` for a typical CRUD shape.

### 2. Prisma model

- Edit `prisma/schema.prisma`. Add the model.
- Better Auth user IDs are `text`. Use `userId String` — never `uuid`.
- Entity `id` columns are uuid: `id String @id @default(uuid())`.
- Add `createdAt DateTime @default(now())` and `updatedAt DateTime @updatedAt`.
- Apply: `pnpm db:push` (dev) or `pnpm db:generate` (named migration).

### 3. Repository

- File: `src/server/repositories/<entity>.repository.ts`
- Extend `BaseRepository<T>` (global) or `UserScopedRepository<T>` (user-owned, the common case).
- Zero business logic — only Prisma calls.
- Import Prisma types from `@/generated/prisma`, never `@prisma/client`.
- In raw SQL: never cast `userId::uuid`. Compare as text.

### 4. Service

- File: `src/server/services/<entity>.service.ts`
- Class-based, constructor-injected: `constructor(private <entity>Repo: <Entity>Repository) {}`.
- Layered: L1 (repo only), L2 (repo + L1 services), L3 (complex composition).
- All business logic lives here.

### 5. Register in ServiceFactory (most-forgotten step)

- Edit `src/server/services/service.factory.ts`.
- Add a private field + lazy getter using `??=`. Mirror an existing entry exactly.
- Without this step the service is unreachable from `ctx.services`.

### 6. Router

- File: `src/server/routers/<entity>.router.ts`
- Thin. Use `protectedProcedure` (default) or `publicProcedure`. Validate input with the Zod schema. Delegate to `ctx.services.<entity>`.
- Avoid `Omit<>` patterns on procedure types — they break implicit tRPC type resolution.
- Register the new router in `src/server/router.ts`.

### 7. Service tests

- File: `src/server/__tests__/services/<entity>.service.test.ts`
- Mock the repository via constructor injection (no DI container).
- Add a fixture in `src/server/__tests__/fixtures/` using the override pattern: `mock<Entity>(overrides)`.
- Cover happy path, validation failure, and authorization boundary at minimum.

## Frontend

### 8. Page + components

- Page: `src/app/<route-group>/<feature>/page.tsx` (Server Component by default).
- Page-specific components: `src/app/<route-group>/<feature>/_components/<name>.component.tsx`.
- `'use client'` only when hooks, event handlers, or browser APIs are needed.
- Direct default export. Kebab-case filename, `.component.tsx` suffix.
- Workspace pages auto-pick `RPGLayout` vs `ProductivityLayout` by pathname — no manual layout import needed.

### 9. Client data hooks

- Queries / mutations: `trpcOptions.<router>.<proc>.queryOptions()` / `.mutationOptions()`.
- Invalidation only: `trpc.<router>.<proc>.queryKey()` inside `onSuccess`.
- Common mistake: `trpc.*.queryOptions()` does not work — must be `trpcOptions`.
- Never call `setState` synchronously inside `useEffect` (lints out via `react-hooks/set-state-in-effect`). Initialize with a lazy function: `useState(() => ...)`.

### 10. Client state (only if needed)

- Server state lives in TanStack Query — do not mirror it into Zustand.
- For client-only state, add a slice in `src/stores/` following the existing slice pattern.

## i18n

### 11. Add keys to BOTH locales

- Edit `public/locales/en/translation.json` AND `public/locales/es/translation.json` in the same change.
- Never hardcode user-facing strings — wrap with `useTranslation()`.
- If unsure about a Spanish translation, write `TODO_ES: <english>` and flag for human review rather than inventing.
- Copy tone: friendly, funny, energetic, RPG-themed. See the tasks empty states for the canonical example.

## Verification (exact order)

```bash
pnpm lint
npx tsc --noEmit
pnpm test:run
```

Husky `pre-push` mirrors the full Railway build chain. Do not bypass with `--no-verify`.

## Output

After scaffolding, report back:

- File:line table of every new and edited file.
- Any step skipped and why.
- Status of each verification command.
- Conventional-commits subject suggestion (`feat: <description>`).
