# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Covenant is a gamified productivity platform combining task management, habit tracking, and objective setting with RPG-style progression. It follows a biblical Apocalypse narrative theme in a dark fantasy setting.

## Design System

Visual identity, faction color palettes, typography, and UI principles are in:

@DESIGN.md

## Commands

### Development

This project uses TypeScript throughout. When modifying types or interfaces, always verify downstream tRPC type inference and avoid Omit<> patterns that break implicit type resolution. Run `tsc --noEmit` after type changes.

Always run the full test suite (`pnpm run test`) after making changes, especially for auth, combat, tier progression, and crafting systems. Do not consider a task complete until tests pass.

```bash
pnpm dev    # Start Next.js dev server (includes backend API routes)
```

### Testing

Uses Vitest. Test files go in `src/server/__tests__/` mirroring the source structure. Mock fixture factories live in `__tests__/fixtures/` using the override pattern (e.g., `mockCharacter(overrides)`). Services are tested by mocking repositories via constructor injection.

```bash
pnpm test           # Run tests
pnpm test:run       # Run tests once (used in CI and pre-push hook)
pnpm test:coverage  # Run with coverage
```

### Linting

```bash
pnpm lint
npx tsc --noEmit    # Type-check only (required after type/interface changes)
```

### Pre-push Hook

Husky runs a full dry-run on every `git push` via `.husky/pre-push`:

```bash
pnpm install --frozen-lockfile && pnpm prisma generate && pnpm lint && npx tsc --noEmit && pnpm build && pnpm test:run
```

This simulates Railway's build and catches deployment failures before they hit production. Bypass in emergencies with `git push --no-verify`.

### Database

```bash
npx prisma db push      # Push schema to database
npx prisma generate     # Regenerate client
npx prisma migrate dev  # Create migration
```

## Architecture

### Project Structure

Single Next.js app with embedded tRPC server:

- `src/app/` - Next.js App Router pages and API routes
- `src/app/api/trpc/` - tRPC route handler (fetch adapter)
- `src/app/api/auth/` - Better Auth route handler
- `src/server/` - Backend (tRPC routers, services, repositories, Prisma)
- `src/shared/` - Zod schemas, types, and game constants (single source of truth)
- `src/components/` - Shared React components
- `prisma/` - Prisma schema and migrations
- `docs/specs/` - Technical specifications for complex features

### Backend Layered Architecture

```
Request → Router (validation) → Service (business logic) → Repository (data access)
```

- **Routers**: Thin layer, input validation only, delegates to services. Use `protectedProcedure` for authenticated routes, `publicProcedure` for public routes
- **Services**: Class-based with constructor injection, accessed via `ctx.services`
- **Repositories**: Prisma queries, one per entity, no business logic. Extend `BaseRepository<T>` or `UserScopedRepository<T>` from `base.repository.ts`
- **Service Factory**: `src/server/services/service.factory.ts` registers all services with lazy initialization (`??=`). Services are layered — Layer 1: repo-only deps, Layer 2: repo + L1 services, Layer 3: complex deps. New services must be registered here to be available via `ctx.services`

### Frontend Architecture

- **Route Groups**: `(auth)` for authentication, `(workspace)` for main app, `(landing)` for landing pages
- **Page Components**: `app/[route]/page.tsx`
- **Page-specific Components**: `app/[route]/_components/`
- **Shared Components**: `components/` (ui primitives in `components/ui/`) from shadcn ui
- **Static Pages**: MDX files in `app/` for static content pages (e.g., news, mechanics)
- **State**: Server state via TanStack Query/tRPC, client state via Zustand with slice pattern
- **Dual Layout**: Workspace dynamically selects RPGLayout vs ProductivityLayout based on route (`/map`, `/inventory`, `/shop` → RPG)

### tRPC Usage

Two exports from `@/utils/trpc.utils` serve different purposes:

- **`trpcOptions`**: Use for `queryOptions()` and `mutationOptions()` with TanStack Query hooks
- **`trpc`**: Use for `queryKey()` when invalidating queries

```tsx
// Queries - use trpcOptions for options
const { data } = useSuspenseQuery(trpcOptions.dashboard.get.queryOptions())

// Mutations - use trpcOptions for options
const mutation = useMutation(
  trpcOptions.habits.create.mutationOptions({
    onSuccess: () => {
      // Invalidation - use trpc for queryKey
      queryClient.invalidateQueries({ queryKey: trpc.habits.getAll.queryKey() })
    }
  })
)
```

**Common mistake**: Using `trpc.*.queryOptions()` or `trpc.*.mutationOptions()` will not work correctly. Always use `trpcOptions` for options.

### Server-Side tRPC Caller (RSC)

For React Server Components, use the server-side caller to fetch data without HTTP overhead:

```tsx
import { createServerCaller } from '@/server/trpc-caller'

export default async function Page() {
  const trpc = await createServerCaller()
  const data = await trpc.dashboard.getData()
  return <ClientComponent initialData={data} />
}
```

## Code Conventions

### File Naming

- `kebab-case` with suffixes: `.component.tsx`, `.utils.ts`, `.store.ts`, `.router.ts`
- Hooks: `use-*.ts`
- Next.js pages: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`

### Code Style

- No semicolons
- Single quotes
- No trailing commas
- `printWidth: 120`
- Formatting source of truth: `.prettierrc` at repo root
- Never use `any` - use `unknown` with type guards if needed
- Use `z.infer<typeof schema>` for TypeScript types from Zod schemas
- Use path aliases (`@/*`, `@shared/*`, `@ui/*`) instead of relative imports

### Components

- Direct default export: `export default function MyComponent()`
- Server Components by default (no directive)
- Add `'use client'` only when using hooks, event handlers, or browser APIs

### i18n

- **NEVER hardcode user-facing strings** - always use translation keys via `useTranslation()` hook
- Translation files location:
  - English: `public/locales/en/translation.json`
  - Spanish: `public/locales/es/translation.json`
- Add keys to BOTH locale files when adding new strings
- Use `t('key')` for translations, never raw strings like `"Range"` or `"Pattern"`

### Git Commits

- Conventional format: `<type>: <description>` (e.g., `fix:`, `feat:`, `docs:`, `test:`, `build:`)
- Lowercase description, no period at end
- PRs squash-merge with `(#N)` suffix

### Environment

- `.env.example` has all required variables (DATABASE_URL, JWT_SECRET, GOOGLE_CLIENT_ID, etc.)

## Adding Features

1. Check `roadmap.md` for current phase priorities
2. Create spec in `docs/specs/` to document the implementation
3. Add Zod schema in `src/shared/schemas/`
4. Backend: Repository → Service → Register in ServiceFactory → Router
5. Frontend: Component → Hook → View
6. Add i18n keys to both locales

## Debugging

When fixing bugs, identify ALL code paths affected before applying changes. Never fix only 1-2 of 3+ paths — trace every caller/reference to the affected logic and fix comprehensively in one pass.

Apply minimal, targeted fixes. Do NOT add strict validation that rejects existing/legacy state. Do NOT refactor adjacent code unless explicitly asked. When fixing one behavior, verify that all existing features still work before committing.
