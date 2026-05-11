# AGENTS.md

Compact instruction file for OpenCode sessions working in this repository.

## Project

Covenant — gamified productivity platform with RPG-style progression. Single Next.js 16 app with embedded tRPC backend, Prisma/PostgreSQL, Tailwind v4, React 19.

- **Design system**: visual identity, faction palettes, and UI principles are in `@DESIGN.md`

## Quickstart

- **Node**: `>=22.12.0`
- **Package manager**: `pnpm@10.4.1` (enforced via `packageManager` field)
- **Install**: `pnpm install` (runs `prisma generate` automatically via `postinstall`)
- **Dev**: `pnpm dev` (single Next.js dev server — backend runs as API routes, not a separate process)
- **Env**: copy `.env.example` → `.env.local` (Prisma config loads `.env.local` via `prisma.config.ts`)

## Verification Order

After changes, run in this order:

```bash
pnpm lint
npx tsc --noEmit   # required after type/interface changes
pnpm test:run      # vitest, must pass before considering task complete
```

**Pre-push dry run**: Husky runs a full build + test on every `git push` via `.husky/pre-push`. This simulates Railway's `buildCommand` exactly (`pnpm install --frozen-lockfile && pnpm prisma generate && pnpm lint && npx tsc --noEmit && pnpm build && pnpm test:run`) and catches deployment failures before they hit production.

To bypass the hook in emergencies: `git push --no-verify`

## Deployment / Railway

- **Config**: `railway.toml` — uses `railpack` builder with `buildCommand` and `startCommand`
- **Healthcheck**: `/api/health` with 100s timeout
- **Preview environments**: Enable in Railway dashboard under Project Settings → Environments → "Generate Environments for PRs". This creates isolated preview deployments for every pull request using real Railway infrastructure.
- **CI**: `.github/workflows/pr.yml` runs lint, TypeScript, build, and tests on every PR

## Testing

- **Runner**: Vitest, node environment
- **Pattern**: `src/server/__tests__/**/*.test.ts`
- **Fixtures**: `src/server/__tests__/fixtures/` use override pattern: `mockCharacter(overrides)`
- **Services**: mock repositories via constructor injection (see existing tests)
- **Single test**: `pnpm vitest run src/server/__tests__/services/character.service.test.ts`
- **Coverage**: `pnpm test:coverage`

## Database / Prisma

- **Schema**: `prisma/schema.prisma`
- **Client output**: `generated/prisma` (custom output, not `node_modules/.prisma`)
- **Commands**:
  - `pnpm db:push` → `prisma db push`
  - `pnpm db:generate` → `prisma migrate dev` (creates migration)
  - `pnpm db:migrate` → `prisma migrate deploy`
  - `npx prisma generate` → regenerate client only
- Config reads `DIRECT_URL` from `.env.local` via `prisma.config.ts`

## Architecture

### Backend (tRPC + layered services)

```
Request → Router (validation) → Service (business logic) → Repository (data access)
```

- **Routers**: `src/server/routers/*.router.ts` — thin, delegate to services. Use `protectedProcedure` for auth routes, `publicProcedure` for public.
- **Services**: class-based, constructor-injected. Accessed via `ctx.services`.
- **Repositories**: extend `BaseRepository<T>` or `UserScopedRepository<T>`. One per entity, zero business logic.
- **ServiceFactory**: `src/server/services/service.factory.ts` — registers all services with lazy init (`??=`). Layered: L1 (repo-only), L2 (repo + L1), L3 (complex). **New services must be registered here.**
- **Context**: `src/server/context.ts` — creates `ServiceFactory(prisma)`, attaches user session from Better Auth.

### Frontend (Next.js App Router)

- **Route groups**: `(auth)` onboarding/login, `(workspace)` main app, `(landing)` marketing pages
- **tRPC handler**: `src/app/api/trpc/[...trpc]/route.ts`
- **Auth handler**: `src/app/api/auth/[...all]/route.ts` (Better Auth)
- **Page components**: `app/[route]/page.tsx`
- **Page-specific components**: `app/[route]/_components/`
- **Shared UI primitives**: `src/components/ui/` (shadcn)
- **State**: server state via TanStack Query + tRPC; client state via Zustand with slice pattern (`src/stores/`)
- **Dual layout**: Workspace layout selects `RPGLayout` (quests, inventory, shop) vs `ProductivityLayout` (dashboard, tasks, habits, objectives) based on pathname
- **Static pages**: MDX files in `app/` for static content (news, mechanics, roadmap, etc.)

### tRPC Client Usage (critical)

Two exports from `@/utils/trpc.utils`:

- **`trpcOptions`**: use for `queryOptions()` / `mutationOptions()` with TanStack Query hooks
- **`trpc`**: use **only** for `queryKey()` when invalidating queries

```tsx
const { data } = useSuspenseQuery(trpcOptions.dashboard.get.queryOptions())
const mutation = useMutation(
  trpcOptions.habits.create.mutationOptions({
    onSuccess: () => queryClient.invalidateQueries({ queryKey: trpc.habits.getAll.queryKey() })
  })
)
```

**Common mistake**: `trpc.*.queryOptions()` does not work. Always use `trpcOptions` for options.

### Server-Side tRPC (RSC)

```tsx
import { createServerCaller } from '@/server/trpc-caller'
const trpc = await createServerCaller()
const data = await trpc.dashboard.getData()
```

## Code Conventions

- **Format**: `.prettierrc` — no semicolons, single quotes, no trailing commas, `printWidth: 120`
- **No `any`**: use `unknown` with type guards (ESLint rule is off for legacy, but new code should avoid `any`)
- **File naming**: kebab-case with suffixes (`.component.tsx`, `.utils.ts`, `.store.ts`, `.router.ts`)
- **Hooks**: `use-*.ts`
- **Components**: direct default export, Server Components by default, `'use client'` only for hooks/events/browser APIs
- **Types from Zod**: `z.infer<typeof schema>`
- **Imports**: use path aliases (`@/*`, `@shared/*`, `@ui/*`) — never relative imports
- **i18n**: NEVER hardcode user-facing strings. Use `useTranslation()`. Add keys to **both** `public/locales/en/translation.json` and `public/locales/es/translation.json`

## Copy Tone

User-facing empty states and microcopy should follow a **friendly, funny, energetic RPG-themed tone** — treat the user like a hero in an epic quest, blend game flavor with light humor, and avoid dry corporate language. See the tasks empty states for the canonical example.

## Adding a Feature

1. Check `roadmap.md` for phase priorities
2. Write spec in `docs/specs/`
3. Add Zod schema in `src/shared/schemas/`
4. Backend: Repository → Service → Register in ServiceFactory → Router
5. Frontend: Component → Hook → View
6. Add i18n keys to both locales

## Git Commits

- Conventional format: `<type>: <description>` (e.g., `fix:`, `feat:`, `docs:`, `test:`, `build:`)
- Lowercase description, no period at end
- PRs squash-merge with `(#N)` suffix

## Debugging & Bug Fixes

When fixing bugs, trace **every** caller and reference to the affected logic and fix comprehensively in one pass. Never fix only 1–2 of 3+ paths.

- Apply minimal, targeted fixes. Do NOT refactor adjacent code unless explicitly asked.
- Do NOT add strict validation that rejects existing/legacy state.
- Verify all existing features still work before committing.

## Important Gotchas

- `next.config.ts` has `serverExternalPackages: ['pg', 'pino', 'pino-pretty', 'node-cron']` and MDX support via `@next/mdx`
- Prisma client lives at `@/generated/prisma` — do not import from `@prisma/client` directly
- Tests mock repositories by passing them directly into service constructors (no DI container)
- Avoid `Omit<>` patterns that break implicit tRPC type resolution
- **Never call `setState` synchronously inside `useEffect`**. It triggers cascading renders and fails the `react-hooks/set-state-in-effect` lint rule. Instead, initialise state with a lazy function: `useState(() => !safeGet())`.
- **Better Auth user IDs are `text`, not `uuid`** (e.g. `f4FRrCSJBqVEU5WCOTBTaZSHY9NrxnkW`). In raw SQL, never cast `userId::uuid` — it throws `invalid input syntax for type uuid` and turns into a 500. Compare as text. Entity `id` columns (tasks, habits, etc.) ARE uuid and can be cast.

## References

- `CLAUDE.md` — detailed architecture and conventions (preserves more context)
- `README.md` — outdated; describes a split front/server setup that no longer exists. Trust `package.json` scripts and this file instead.
- `.cursorrules` — points to `CLAUDE.md` and `CONVENTIONS.md`

## Agent skills

### Issue tracker

GitHub issues at `YifanYes/covenant` via `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical defaults — `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout at repo root (`CONTEXT.md` + `docs/adr/`). See `docs/agents/domain.md`.
