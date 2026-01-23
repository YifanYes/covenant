# Project Conventions

> For AI coding assistants (Claude, Cursor, Copilot, etc.): Read `.ai/AGENTS.md` for complete instructions.

## Quick Reference

| Document                                           | Purpose                        |
| -------------------------------------------------- | ------------------------------ |
| [.ai/AGENTS.md](.ai/AGENTS.md)                     | Complete AI agent instructions |
| [.ai/CODING_STANDARDS.md](.ai/CODING_STANDARDS.md) | Detailed coding conventions    |
| [mission.md](mission.md)                           | Project purpose and vision     |
| [roadmap.md](roadmap.md)                           | Current phase and priorities   |

## Project: ARQ

A gamified productivity platform combining task management, habit tracking, and goal setting with RPG-style progression.

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, TailwindCSS v4
- **Backend**: Bun, tRPC, Fastify, Prisma, PostgreSQL
- **Validation**: Zod (shared schemas)
- **i18n**: i18next

## Key Conventions

### File Naming

- `kebab-case` with suffixes: `.component.tsx`, `.page.tsx`, `.utils.ts`, `.store.ts`
- Hooks: `use-*.ts`
- Routers: `*.router.ts`

### Code Style

- No semicolons
- Single quotes
- No trailing commas
- Never use `any`
- Always use i18next for strings
- Components: Direct default export (`export default function MyComponent()`)

### Architecture

- Zod schemas in `shared/` (source of truth)
- Backend: Router → Service → Repository
- Frontend: Views in `views/`, shared components in `components/`

### Testing

- Vitest for unit/integration tests
- Mock external dependencies
- Tests co-located or in `__tests__`
