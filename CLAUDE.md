# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ARQ is a gamified productivity platform combining task management, habit tracking, and goal setting with RPG-style progression. It follows a biblical Apocalypse narrative theme.

## Commands

### Development
```bash
# Backend (Terminal 1)
cd server && bun run dev

# Frontend (Terminal 2)
cd front && bun run dev
```

### Testing
```bash
cd server && bun run test           # Run tests
cd server && bun run test:coverage  # Run with coverage
```

### Linting
```bash
cd front && bun run lint
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
- `server/` - Backend (Bun, tRPC, Fastify, Prisma)
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
- **Shared Components**: `components/` (ui primitives in `components/ui/`)
- **State**: Server state via TanStack Query/tRPC, client state via Zustand

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
- All user-facing strings must use i18next
- Add keys to both `front/public/locales/en/translation.json` and `es/translation.json`

## Adding Features

1. Check `roadmap.md` for current phase priorities
2. Create spec in `docs/specs/` if complex
3. Add Zod schema in `shared/schemas/`
4. Backend: Repository → Service → Router
5. Frontend: Component → Hook → View
6. Add i18n keys to both locales

## PR Title Format
`[<workspace>] Description` - e.g., `[front] Add task completion animation`
