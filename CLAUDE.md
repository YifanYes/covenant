# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ARQ is a gamified productivity platform combining task management, habit tracking, and objective setting with RPG-style progression. It follows a biblical Apocalypse narrative theme in a dark fantasy setting.

## Commands

### Development

```bash
# Backend (Terminal 1)
cd server && pnpm dev

# Frontend (Terminal 2)
cd front && pnpm dev
```

### Testing

```bash
cd server && pnpm test           # Run tests
cd server && pnpm test:coverage  # Run with coverage
```

### Linting

```bash
cd front && pnpm lint
```

### Database

```bash
cd server
npx prisma db push      # Push schema to Supabase
npx prisma generate     # Regenerate client
npx prisma migrate dev  # Create migration
```

## Architecture

### Monorepo Structure

- `front/` - Next.js 16 frontend (App Router, React 19, TailwindCSS v4)
- `server/` - Backend (Node.js, tRPC, Fastify, Prisma)
- `shared/` - Zod schemas (single source of truth for types)
- `docs/specs/` - Technical specifications for complex features

### Backend Layered Architecture

```
Request → Router (validation) → Service (business logic) → Repository (data access)
```

- **Routers**: Thin layer, input validation only, delegates to services
- **Services**: Class-based with constructor injection, accessed via `ctx.services`
- **Repositories**: Prisma queries, one per entity, no business logic

### Frontend Architecture

- **Route Groups**: `(auth)` for authentication, `(workspace)` for main app
- **Page Components**: `app/[route]/page.tsx`
- **Page-specific Components**: `app/[route]/_components/`
- **Shared Components**: `components/` (ui primitives in `components/ui/`) from shadcn ui
- **Static Pages**: MDX files in `app/` for static content pages (e.g., news, mechanics)
- **State**: Server state via TanStack Query/tRPC, client state via Zustand with slice pattern

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

## Code Conventions

### File Naming

- `kebab-case` with suffixes: `.component.tsx`, `.utils.ts`, `.store.ts`, `.router.ts`
- Hooks: `use-*.ts`
- Next.js pages: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`

### Code Style

- No semicolons
- Single quotes
- No trailing commas
- Never use `any` - use `unknown` with type guards if needed
- Use `z.infer<typeof schema>` for TypeScript types from Zod schemas

### Components

- Direct default export: `export default function MyComponent()`
- Server Components by default (no directive)
- Add `'use client'` only when using hooks, event handlers, or browser APIs

### i18n

- **NEVER hardcode user-facing strings** - always use translation keys via `useTranslation()` hook
- Translation files location:
  - English: `front/public/locales/en/translation.json`
  - Spanish: `front/public/locales/es/translation.json`
- Add keys to BOTH locale files when adding new strings
- Use `t('key')` for translations, never raw strings like `"Range"` or `"Pattern"`

## Adding Features

1. Check `roadmap.md` for current phase priorities
2. Create spec in `docs/specs/` to document the implementation
3. Add Zod schema in `shared/schemas/`
4. Backend: Repository → Service → Router
5. Frontend: Component → Hook → View
6. Add i18n keys to both locales

## PR Title Format

`[<workspace>] Description` - e.g., `[front] Add task completion animation`
