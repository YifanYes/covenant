# Coding Standards & Best Practices

> Complete coding conventions for the ARQ project. Referenced by [AGENTS.md](AGENTS.md).

---

## 1. Architecture & Technologies

### Monorepo Structure

| Workspace | Purpose                   | Key Technologies               |
| --------- | ------------------------- | ------------------------------ |
| `/shared` | Zod schemas, shared types | Zod, TypeScript                |
| `/front`  | React SPA                 | React 19, Vite, TailwindCSS v4 |
| `/server` | API server                | Bun, tRPC, Fastify, Prisma     |

### Backend Layered Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      tRPC Routers                           │
│  • Input validation (Zod)                                   │
│  • Protocol handling                                        │
│  • Delegates to services                                    │
├─────────────────────────────────────────────────────────────┤
│                       Services                              │
│  • Business logic                                           │
│  • Class-based with constructor injection                   │
│  • Orchestrates repositories                                │
├─────────────────────────────────────────────────────────────┤
│                     Repositories                            │
│  • Prisma queries                                           │
│  • One per entity                                           │
│  • No business logic                                        │
└─────────────────────────────────────────────────────────────┘
```

**ServiceFactory** (`server/services/service.factory.ts`) manages service instantiation. Access via `ctx.services` in tRPC procedures.

---

## 2. Naming Conventions

### Files

| Type           | Pattern                    | Example                   |
| -------------- | -------------------------- | ------------------------- |
| Components     | `kebab-case.component.tsx` | `task-card.component.tsx` |
| Pages/Views    | `kebab-case.page.tsx`      | `dashboard.page.tsx`      |
| Utilities      | `kebab-case.utils.ts`      | `date.utils.ts`           |
| Models/Types   | `kebab-case.model.ts`      | `task.model.ts`           |
| Config         | `kebab-case.config.ts`     | `theme.config.ts`         |
| Stores         | `kebab-case.store.ts`      | `auth.store.ts`           |
| Libraries      | `kebab-case.lib.ts`        | `trpc.lib.ts`             |
| Hooks          | `use-kebab-case.ts`        | `use-theme.ts`            |
| Server Routers | `kebab-case.router.ts`     | `tasks.router.ts`         |

### Variables & Functions

- Use `camelCase` consistently
- Boolean variables: prefix with `is`, `has`, `should`, `can`
- Event handlers: prefix with `handle` or `on`

### Folders

- Use `kebab-case` for all directories
- Group by feature/domain, not by type

---

## 3. Frontend Architecture

### Directory Structure

```
front/src/
├── components/          # Shared/reusable components only
│   ├── ui/              # Shadcn primitives
│   ├── common/          # Shared non-UI components
│   ├── forms/           # Form components
│   ├── skeletons/       # Loading skeletons
│   └── [domain]/        # Domain-specific shared components
├── views/               # Page components
│   ├── [domain]/        # Domain grouping (adventure/, auth/)
│   │   ├── [page]/      # Individual pages
│   │   └── components/  # Shared within domain
│   └── [page]/          # Standalone pages
├── hooks/               # Custom hooks (use-*.ts)
├── stores/              # Zustand stores (*.store.ts)
├── layouts/             # Layout components
├── styles/              # Design tokens, global CSS
├── lib/                 # External library configs
├── utils/               # Utility functions
└── types/               # Global type definitions
```

### Component Folder Structure

For complex components, use the 4-subdomain pattern:

```
component-name/
├── component-name.component.tsx  # Main component
├── component-name.config.ts      # Constants, configuration
├── component-name.utils.ts       # Helper functions
└── component-name.model.ts       # Types (except FC props)
```

Simple components (< 150 lines) can be single files.

### Component Export Pattern

Always use direct default function exports:

```tsx
// ✅ Good
export default function TaskCard({ task }: TaskCardProps) {
  return <div>...</div>
}

// ❌ Avoid
const TaskCard = ({ task }: TaskCardProps) => {
  return <div>...</div>
}
export default TaskCard
```

### Import Aliases

| Alias       | Path                     |
| ----------- | ------------------------ |
| `@/ui`      | `src/components/ui/`     |
| `@/common`  | `src/components/common/` |
| `@/forms`   | `src/components/forms/`  |
| `@/stores`  | `src/stores/`            |
| `@/lib`     | `src/lib/`               |
| `@/utils`   | `src/utils/`             |
| `@/layouts` | `src/layouts/`           |
| `@/styles`  | `src/styles/`            |

### Styling

- Use **TailwindCSS v4** for all styling
- Use `cn()` utility for conditional classes (`clsx` + `tailwind-merge`)
- Design tokens in `src/styles/tokens.css`
- Reference via Tailwind utilities: `text-tier-1`, `border-rarity-rare`

### Forms

- Use `react-hook-form` with Zod resolvers
- Use `BaseFormDialog` for form dialogs
- Use `BaseConfirmDialog` for confirmations

### Icons

- Use `@nsmr/pixelart-react` for icons

---

## 4. Backend Conventions

### Router Pattern

```typescript
// tasks.router.ts
export const tasksRouter = router({
  getAll: protectedProcedure.input(getTasksSchema).query(({ ctx, input }) => {
    return ctx.services.tasks.getAll(ctx.userId, input)
  })
})
```

### Service Pattern

```typescript
// tasks.service.ts
export class TasksService {
  constructor(private repo: TasksRepository) {}

  async getAll(userId: string, filters: GetTasksInput) {
    // Business logic here
    return this.repo.findMany(userId, filters)
  }
}
```

### Repository Pattern

```typescript
// tasks.repository.ts
export class TasksRepository {
  constructor(private prisma: PrismaClient) {}

  async findMany(userId: string, filters: GetTasksInput) {
    return this.prisma.task.findMany({
      where: { userId, ...filters }
    })
  }
}
```

---

## 5. Type Safety

### Zod as Source of Truth

All schemas live in `shared/schemas/`:

```typescript
// shared/schemas/task.schema.ts
import { z } from 'zod'

export const taskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  completed: z.boolean()
})

export type Task = z.infer<typeof taskSchema>
```

### Rules

- ❌ Never use `any`
- ❌ Don't create manual interfaces when Zod inference works
- ✅ Use `z.infer<typeof schema>` for types
- ✅ Use `unknown` with type guards when type is truly unknown

---

## 6. Internationalization

- All user-facing strings must use i18next
- Add keys to both locales:
  - `front/public/locales/en/translation.json`
  - `front/public/locales/es/translation.json`

```tsx
// ✅ Good
const { t } = useTranslation()
return <h1>{t('dashboard.title')}</h1>

// ❌ Bad
return <h1>Dashboard</h1>
```

---

## 7. State Management

| State Type   | Solution                          |
| ------------ | --------------------------------- |
| Server state | TanStack Query (via tRPC)         |
| Client state | Zustand                           |
| URL state    | URL params (for filters, sorting) |

---

## 8. Code Style (Prettier)

```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "none",
  "printWidth": 120
}
```

### Comments

- Avoid comments unless explaining complex logic
- Code should be self-documenting
- Use JSDoc for public APIs if needed

---

## 9. Git Conventions

### Commits

Follow [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix     | Use                |
| ---------- | ------------------ |
| `feat`     | New functionality  |
| `fix`      | Bug correction     |
| `docs`     | Documentation      |
| `refactor` | Code restructuring |
| `chore`    | Maintenance        |

### Branches

| Branch         | Purpose      |
| -------------- | ------------ |
| `main`         | Production   |
| `feature/name` | New features |
| `fix/name`     | Bug fixes    |

---

## 10. Testing

### Location

- Frontend: `__tests__` or adjacent to components (e.g., `foo.test.tsx`)
- Backend: `server/__tests__/services/`, `server/__tests__/routers/`

### Frameworks

- Frontend: Vitest + React Testing Library
- Backend: Vitest

### Backend Guidelines

- **Unit Tests**: Focus on Services. Mock Repositories.
- **Integration Tests**: Focus on Routers validating inputs and calling services.
- **Mocking**: Use `server/__tests__/mocks/prisma.mock.ts` to mock Prisma.
- **Coverage**: Run `bun run test:coverage` in `server/`. Aim for high coverage on critical logic (Combat, Payment).

### Frontend Guidelines

- Test user interactions (clicks, form submissions).
- Mock API calls using Vitest mocks.
