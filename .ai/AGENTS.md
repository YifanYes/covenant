# AI Agent Instructions

> **Universal AI Context File** - This file provides context for AI coding assistants regardless of IDE (Cursor, Windsurf, Copilot, Kilo Code, Aider, etc.)

## Quick Reference

| Document                                       | Purpose                               |
| ---------------------------------------------- | ------------------------------------- |
| [AGENTS.md](.ai/AGENTS.md)                     | AI agent instructions (this file)     |
| [CODING_STANDARDS.md](.ai/CODING_STANDARDS.md) | Code style, architecture, conventions |
| [mission.md](mission.md)                       | Project purpose and vision            |
| [roadmap.md](roadmap.md)                       | Current phase and upcoming features   |
| [README.md](README.md)                         | Setup and project structure           |

---

## 1. Project Overview

**ARQ** is a gamified productivity platform that combines task management, habit tracking, and goal setting with an RPG-style progression system. The app features a biblical Apocalypse narrative theme.

### Tech Stack

- **Frontend**: React 19, TypeScript, Vite, TailwindCSS v4, React Query, Zustand
- **Backend**: Bun, tRPC, Fastify, Prisma, PostgreSQL (Supabase)
- **Validation**: Zod (shared schemas for end-to-end type safety)
- **i18n**: i18next (English and Spanish)

---

## 2. Core Directives

### 2.1 Mission Awareness

Before implementing features, understand the project's three pillars from [mission.md](mission.md):

1. **High-Performance Productivity** - Eisenhower Matrix, habits, objectives
2. **Immersive Narrative Gamification** - RPG progression tied to real-life actions
3. **Personal Development & Faith** - Spiritual growth through discipline

### 2.2 Spec-Driven Development (SDD)

For complex features, follow this lifecycle:

1. **Plan**: Create a spec in `docs/specs/` before implementation
2. **Implement**: Follow the approved specification strictly
3. **Validate**: Verify the code meets spec requirements

### 2.3 Type Safety First

- All Zod schemas MUST live in the `shared/` workspace
- Use `z.infer<typeof Schema>` for TypeScript types
- Never use `any` - prefer `unknown` with type guards if needed

---

## 3. Architecture

### 3.1 Monorepo Structure

```
arq/
├── front/          # React frontend (Vite + TypeScript)
├── server/         # Backend (tRPC + Fastify + Prisma)
│   ├── routers/    # tRPC router definitions (thin layer)
│   ├── services/   # Business logic (class-based)
│   └── repositories/ # Data access (Prisma queries)
├── shared/         # Shared Zod schemas and types
├── docs/           # Specifications and documentation
│   └── specs/      # Technical specifications
└── .ai/            # AI agent context files
```

### 3.2 Backend Layered Architecture

```
Request → Router (validation) → Service (business logic) → Repository (data access)
```

- **Routers**: Thin layer - only input validation and service delegation
- **Services**: Core business logic, class-based with dependency injection
- **Repositories**: Prisma queries, one per entity

### 3.3 Frontend Architecture

- **Views**: Page components in `front/src/views/`
- **Components**: Reusable UI in `front/src/components/`
- **State**: Server state via TanStack Query, client state via Zustand

---

## 4. Coding Conventions

See [CODING_STANDARDS.md](.ai/CODING_STANDARDS.md) for complete details.

### Quick Rules

| Category        | Convention                                                     |
| --------------- | -------------------------------------------------------------- |
| Files           | `kebab-case` with suffix (e.g., `task-card.component.tsx`)     |
| Variables       | `camelCase`                                                    |
| Components      | Direct default export: `export default function MyComponent()` |
| Semicolons      | None                                                           |
| Quotes          | Single                                                         |
| Trailing commas | None                                                           |

### File Suffixes

| Type       | Suffix           | Example                   |
| ---------- | ---------------- | ------------------------- |
| Components | `.component.tsx` | `task-card.component.tsx` |
| Pages      | `.page.tsx`      | `dashboard.page.tsx`      |
| Utilities  | `.utils.ts`      | `date.utils.ts`           |
| Stores     | `.store.ts`      | `auth.store.ts`           |
| Config     | `.config.ts`     | `theme.config.ts`         |

---

## 5. Common Tasks

### Adding a New Feature

1. Check [roadmap.md](roadmap.md) for current phase priorities
2. Create spec in `docs/specs/` if complex
3. Add Zod schema in `shared/schemas/`
4. Implement backend: Repository → Service → Router
5. Implement frontend: Component → Hook → View
6. Add i18n keys to both `en/translation.json` and `es/translation.json`

### Database Changes

```bash
cd server
# Edit prisma/schema.prisma
npx prisma db push    # Push to Supabase
npx prisma generate   # Regenerate client
```

### Running the Project

```bash
# Terminal 1: Backend
cd server && bun run dev

# Terminal 2: Frontend
cd front && bun run dev
```

---

## 6. Testing & Quality

### CI Workflow

- Review the CI workflow in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)
- The workflow runs on push to `main` branch and deploys to AWS

### Backend Testing

- Tests are located in `server/__tests__/`
- Use Vitest as the testing framework
- Run tests with `bun run test` (in server dir)
- Mock database calls using `prisma.mock.ts` (do not access real DB in tests)

### Running Lint

```bash
# Frontend linting
cd front && npm run lint
```

### Quality Gates

- No code with type errors is accepted
- Run lint before committing
- Add or update tests when changing behavior, even if not explicitly requested

---

## 7. Performance & Technical Decisions

- Don't guess performance, bundle size, or load times: measure
- If something seems slow, add instrumentation before optimizing
- Validate changes on a small scale before applying to the entire project

---

## 8. Commits & Pull Requests

### PR Title Format

`[<workspace>] Clear and concise description`

Examples:

- `[front] Add task completion animation`
- `[server] Fix habit streak calculation`
- `[shared] Add objective validation schema`

### Before Committing

1. Run `npm run lint` in the affected workspace
2. Ensure no TypeScript errors
3. Explain what changed, why, and how it was verified

### PR Guidelines

- Keep PRs small and focused
- If introducing a new constraint ("never X", "always Y"), document it in this file

---

## 9. What NOT to Do

- ❌ Don't hardcode user-facing strings (use i18next)
- ❌ Don't put business logic in routers
- ❌ Don't use `any` type
- ❌ Don't create manual interfaces when Zod inference works
- ❌ Don't run destructive commands (`rm -rf`, etc.)
- ❌ Don't skip the spec for complex features

---

## 10. Agent Behavior

### Clarification First

- If a request is unclear, ask specific questions before executing
- Simple, well-defined tasks can be executed directly
- Complex changes (refactors, new features, architecture decisions) require confirming understanding before acting

### No Implicit Assumptions

- Don't assume implicit requirements
- If information is missing, ask for it
- When in doubt, clarify rather than guess
