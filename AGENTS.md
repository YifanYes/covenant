# AGENTS.md

## Project

Covenant — gamified productivity, RPG progression. Next.js 16 + tRPC + Prisma/Postgres + Tailwind v4 + React 19.

Design system: `@DESIGN.md`.

## Working principles

### Think before coding

- State assumptions explicit. Uncertain → ask.
- Multiple interpretations → present, don't pick silent.
- Simpler approach exists → say so. Push back when warranted.
- Unclear → stop, name confusion, ask.

### Simplicity first

- Min code solve problem. Nothing speculative.
- No features beyond ask. No abstractions for single-use code.
- No configurability not requested. No error handling for impossible scenarios.

### Surgical edits

- Touch only what required. Match existing style even if you'd write different.
- No "improvements" to adjacent code, comments, formatting.
- No refactor of things not broken.
- Clean orphans YOUR change created (unused imports/vars/functions). Don't sweep pre-existing dead code — mention instead.
- Every changed line trace to user request.

### Goal-driven execution

- Define verifiable success criteria before coding.
- "Fix bug" → write failing test reproducing bug, then make pass.
- "Add validation" → write tests for invalid inputs, then make pass.
- Multi-step task → state brief plan with per-step verify check.

## Quickstart

- Node `>=24.0.0`, pnpm `11.1.2` (enforced via `packageManager`)
- Install: `pnpm install` (auto-runs `prisma generate`)
- Dev: `pnpm dev` (backend = API routes, no separate process)
- Env: copy `.env.example` → `.env.local` (Prisma reads via `prisma.config.ts`)

## Verification

After changes:

```bash
pnpm lint
pnpm typecheck
pnpm test:run      # vitest, must pass
```

Pre-push: Husky runs full build+test via `.husky/pre-push`, mirrors Railway `buildCommand` exact: `pnpm install --frozen-lockfile && pnpm prisma generate && pnpm lint && pnpm typecheck && pnpm build && pnpm test:run`. Bypass: `git push --no-verify`.

## Deployment / Railway

- Config: `railway.toml` — `railpack` builder, `buildCommand` / `preDeployCommand` (runs `prisma db push` once per deploy) / `startCommand` (`pnpm start` only — no schema mutation on container restart)
- Healthcheck: `/api/health`, 100s timeout
- Preview envs: Railway dashboard → Project Settings → Environments → "Generate Environments for PRs"
- CI: `.github/workflows/pr.yml` runs lint/TS/build/tests on PRs
- Prod: zero users, beta. Destructive schema changes OK (renames, dropped defaults, `--accept-data-loss`). No migration SQL for renames.

## Testing

- Runner: Vitest, node env
- Pattern: `src/server/__tests__/**/*.test.ts`
- Fixtures: `src/server/__tests__/fixtures/`, override pattern `mockCharacter(overrides)`
- Services: inject mock repos via constructors
- Single test: `pnpm vitest run src/server/__tests__/services/character.service.test.ts`
- Coverage: `pnpm test:coverage`
- Test-first for bugs and validation: write failing test reproducing issue, then make pass.

## Database / Prisma

- Schema: `prisma/schema.prisma`
- Client output: `generated/prisma` (custom, not `node_modules/.prisma`)
- Commands:
  - `pnpm db:push` → `prisma db push`
  - `pnpm db:generate` → `prisma migrate dev`
  - `pnpm db:migrate` → `prisma migrate deploy`
  - `npx prisma generate` → client only
- `DIRECT_URL` read from `.env.local` via `prisma.config.ts`
- Dev workflow: `pnpm db:push` + `npx prisma generate`. No `migrate dev` during active dev.

## Architecture

### Backend (tRPC + layered services)

```
Request → Router (validation) → Service (logic) → Repository (data)
```

- Routers `src/server/routers/*.router.ts`: thin, delegate to services. `protectedProcedure` for auth, `publicProcedure` for public.
- Services: class-based, constructor-injected. Access via `ctx.services`.
- Repositories: extend `BaseRepository<T>` / `UserScopedRepository<T>`. One per entity, zero business logic.
- ServiceFactory `src/server/services/service.factory.ts`: lazy init via `??=`. Tiered L1 (repo-only) → L2 (repo + L1) → L3 (complex). **New services must register here.**
- Context `src/server/context.ts`: creates `ServiceFactory(prisma)`, attaches Better Auth session.

### Frontend (Next.js App Router)

- Route groups: `(auth)` onboarding/login, `(workspace)` main app, `(landing)` marketing
- tRPC handler: `src/app/api/trpc/[...trpc]/route.ts`
- Auth handler: `src/app/api/auth/[...all]/route.ts` (Better Auth)
- Page-specific components: `app/[route]/_components/`
- Shared UI primitives: `src/components/ui/` (shadcn)
- State: server = TanStack Query + tRPC; client = Zustand slices in `src/stores/`
- Dual layout: `RPGLayout` (quests/inventory/shop) vs `ProductivityLayout` (dashboard/tasks/habits/objectives), pathname-driven
- Static pages: MDX in `app/` (news, mechanics, roadmap, etc.)

### tRPC Client (critical)

Two exports from `@/utils/trpc.utils`:

- `trpcOptions`: for `queryOptions()` / `mutationOptions()` with TanStack hooks
- `trpc`: **only** for `queryKey()` when invalidating

```tsx
const { data } = useSuspenseQuery(trpcOptions.dashboard.get.queryOptions())
const mutation = useMutation(
  trpcOptions.habits.create.mutationOptions({
    onSuccess: () => queryClient.invalidateQueries({ queryKey: trpc.habits.getAll.queryKey() })
  })
)
```

Footgun: `trpc.*.queryOptions()` NOT work. Use `trpcOptions` for options.

### Server-Side tRPC (RSC)

```tsx
import { createServerCaller } from '@/server/trpc-caller'
const trpc = await createServerCaller()
const data = await trpc.dashboard.getData()
```

## Conventions

- Format `.prettierrc`: no semis, single quotes, no trailing commas, `printWidth: 120`
- No `any` in new code. Use `unknown` + type guards (ESLint rule off for legacy)
- File naming: kebab-case + suffix (`.component.tsx`, `.utils.ts`, `.store.ts`, `.router.ts`)
- Hooks: `use-*.ts`
- Components: direct default export, Server Components by default. `'use client'` only for hooks/events/browser APIs
- Types from Zod: `z.infer<typeof schema>`
- Imports: path aliases (`@/*`, `@shared/*`, `@ui/*`). No relative imports.
- i18n: NEVER hardcode user-facing strings. Use `useTranslation()`. Add keys to BOTH `public/locales/en/translation.json` and `public/locales/es/translation.json`.

## Forms & Dialogs

- Forms: `react-hook-form` + `standardSchemaResolver` from `@hookform/resolvers/standard-schema`, validated by Zod schemas in `src/shared/schemas/`. Use `Controller` for non-native inputs (Tiptap, Select, etc.).
- Form modals: `src/components/common/base-form-dialog.component.tsx`. Pass i18n keys (not translated strings) for `title` / `submitLabel` / `cancelLabel` — component calls `t()` internal. Wire `onSubmit={handleSubmit(onSubmit)}`, `isSubmitDisabled`, `isLoading`. Use `extraFooterActions` for left-aligned secondary actions (e.g. delete).
- Destructive confirmations: `src/components/common/base-confirm-dialog.component.tsx`. Default `variant="destructive"`. Pass i18n keys for `title` / `description` / `confirmLabel`.
- Do NOT hand-roll `<Dialog><DialogContent>...<LoaderButton/>` in feature code when base dialog fits.

## Copy Tone

Empty states + microcopy: friendly, funny, energetic, RPG-themed. Treat user as hero on epic quest. No dry corporate. Canonical example: tasks empty states.

## Adding a Feature

`TODO.md` → spec in `docs/specs/` → Zod schema in `src/shared/schemas/` → Repository → Service → register in ServiceFactory → Router → Component → Hook → View → i18n keys (both locales).

## Git Commits

Conventional: `<type>: <description>` (`fix:`, `feat:`, `docs:`, `test:`, `build:`). Lowercase, no period. PRs squash-merge with `(#N)` suffix.

## Debugging & Bug Fixes

Trace EVERY caller/reference of affected logic. Fix all paths one pass. Never fix only 1–2 of 3+.

- See Working principles → Surgical edits for scope rules.
- No strict validation rejecting existing/legacy state.
- Verify all existing features still work before commit.

## Gotchas

- `next.config.ts`: `serverExternalPackages: ['pg', 'pino', 'pino-pretty', 'node-cron']`, MDX via `@next/mdx`
- Prisma client at `@/generated/prisma`. Do NOT import `@prisma/client` direct.
- Tests inject repos direct into service constructors. No DI container.
- Avoid `Omit<>` — breaks implicit tRPC type resolution.
- NEVER call `setState` sync inside `useEffect`. Triggers cascading renders, fails `react-hooks/set-state-in-effect` lint. Use lazy init: `useState(() => !safeGet())`.
- Better Auth user IDs are `text`, NOT `uuid` (e.g. `f4FRrCSJBqVEU5WCOTBTaZSHY9NrxnkW`). In raw SQL, never cast `userId::uuid` — throws `invalid input syntax for type uuid`, 500. Compare as text. Entity `id` cols (tasks, habits, etc.) ARE uuid and can cast.

## References

- `CLAUDE.md` — detailed architecture and conventions
- `README.md` — outdated (describes split front/server setup no longer exists). Trust `package.json` + this file.
- `.cursorrules` — points to `CLAUDE.md` / `CONVENTIONS.md`

## Agent skills

| Skill         | Source                                                                                                            |
| ------------- | ----------------------------------------------------------------------------------------------------------------- |
| Issue tracker | GitHub `YifanYes/covenant` via `gh`. See `docs/agents/issue-tracker.md`                                           |
| Triage labels | `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md` |
| Domain docs   | `CONTEXT.md` + `docs/adr/`. See `docs/agents/domain.md`                                                           |