# Coding Standards & Best Practices

> Complete coding conventions for the Covenant project. Referenced by [AGENTS.md](AGENTS.md).

---

## 1. Architecture & Technologies

### Monorepo Structure

| Workspace | Purpose                   | Key Technologies                            |
| --------- | ------------------------- | ------------------------------------------- |
| `/shared` | Zod schemas, shared types | Zod, TypeScript                             |
| `/front`  | Next.js application       | Next.js 16, React 19, TailwindCSS v4        |
| `/server` | API server                | Bun, tRPC, Fastify, Prisma                  |

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

| Type                  | Pattern                    | Example                   |
| --------------------- | -------------------------- | ------------------------- |
| Components            | `kebab-case.component.tsx` | `task-card.component.tsx` |
| Utilities             | `kebab-case.utils.ts`      | `date.utils.ts`           |
| Models/Types          | `kebab-case.model.ts`      | `task.model.ts`           |
| Config                | `kebab-case.config.ts`     | `theme.config.ts`         |
| Stores                | `kebab-case.store.ts`      | `auth.store.ts`           |
| Libraries             | `kebab-case.lib.ts`        | `trpc.lib.ts`             |
| Hooks                 | `use-kebab-case.ts`        | `use-theme.ts`            |
| Server Routers        | `kebab-case.router.ts`     | `tasks.router.ts`         |
| **Next.js Specific:** |                            |                           |
| Page                  | `page.tsx`                 | `app/dashboard/page.tsx`  |
| Layout                | `layout.tsx`               | `app/(workspace)/layout.tsx` |
| Loading               | `loading.tsx`              | `app/dashboard/loading.tsx`  |
| Error                 | `error.tsx`                | `app/error.tsx`           |
| Not Found             | `not-found.tsx`            | `app/not-found.tsx`       |
| Route Handler         | `route.ts`                 | `app/api/auth/route.ts`   |

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
front/
├── app/                 # Next.js App Router
│   ├── (auth)/          # Auth route group (login, signup, onboarding)
│   ├── (workspace)/     # Main app route group (dashboard, tasks, etc.)
│   │   ├── [page]/      # Individual pages
│   │   │   ├── page.tsx            # Page component
│   │   │   └── _components/        # Page-specific components
│   │   └── layout.tsx   # Workspace layout
│   ├── providers/       # Context providers (tRPC, i18n)
│   ├── layout.tsx       # Root layout
│   └── globals.css      # Global styles
├── components/          # Shared/reusable components
│   ├── ui/              # Shadcn primitives
│   ├── common/          # Shared non-UI components
│   ├── forms/           # Form components
│   ├── skeletons/       # Loading skeletons
│   ├── tasks/           # Task-specific shared components
│   └── [domain]/        # Other domain-specific shared components
├── hooks/               # Custom hooks (use-*.ts)
├── stores/              # Zustand stores (*.store.ts)
├── lib/                 # External library configs
├── utils/               # Utility functions
├── types/               # Global type definitions
├── styles/              # Design tokens
└── middleware.ts        # Next.js middleware (auth, routing)
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

**Note**: Page-specific components go in `app/[route]/_components/`, while shared components go in `components/`.

### Component Export Pattern

Always use direct default function exports:

```tsx
// ✅ Good - Server Component (default in App Router)
export default function TaskCard({ task }: TaskCardProps) {
  return <div>...</div>
}

// ✅ Good - Client Component (when needed)
'use client'

export default function InteractiveButton({ onClick }: ButtonProps) {
  return <button onClick={onClick}>Click me</button>
}

// ❌ Avoid
const TaskCard = ({ task }: TaskCardProps) => {
  return <div>...</div>
}
export default TaskCard
```

**Next.js specific**:
- Use Server Components by default (no 'use client' directive)
- Add 'use client' only when using hooks, event handlers, or browser APIs
- Pages can be async for data fetching: `export default async function Page()`

### Import Aliases

| Alias       | Path                  |
| ----------- | --------------------- |
| `@/ui`      | `components/ui/`      |
| `@/common`  | `components/common/`  |
| `@/forms`   | `components/forms/`   |
| `@/stores`  | `stores/`             |
| `@/lib`     | `lib/`                |
| `@/utils`   | `utils/`              |
| `@/types`   | `types/`              |
| `@/styles`  | `styles/`             |

**Note**: Import aliases are relative to `front/` directory (Next.js baseUrl).

### Styling

- Use **TailwindCSS v4** for all styling
- Use `cn()` utility for conditional classes (`clsx` + `tailwind-merge`)
- Design tokens in `styles/tokens.css`
- Global styles in `app/globals.css`
- Reference via Tailwind utilities: `text-tier-1`, `border-rarity-rare`

### Forms

- Use `react-hook-form` with Zod resolvers
- Use `BaseFormDialog` for form dialogs
- Use `BaseConfirmDialog` for confirmations

### Icons

- Use `@nsmr/pixelart-react` for icons

### Next.js App Router Conventions

**Route Groups**:
- Use parentheses for route groups that don't affect URL: `(auth)`, `(workspace)`
- Route groups organize code without adding path segments

**Server vs Client Components**:
- **Default**: Server Components (no directive needed)
- **Use Server Components for**:
  - Static content
  - Data fetching
  - Accessing backend resources
  - SEO-critical content
- **Use Client Components ('use client') for**:
  - Interactive elements (onClick, onChange, etc.)
  - React hooks (useState, useEffect, etc.)
  - Browser APIs
  - Context consumers (useTranslation, etc.)

**Data Fetching**:
- Fetch data in Server Components directly (async/await)
- Use tRPC with TanStack Query for Client Components
- No need for getServerSideProps or getStaticProps (App Router uses Server Components)

**File Conventions**:
- `page.tsx` - Route page (required for route to be accessible)
- `layout.tsx` - Shared UI for a segment and its children
- `loading.tsx` - Loading UI (automatic Suspense boundary)
- `error.tsx` - Error UI (automatic Error boundary)
- `not-found.tsx` - 404 UI
- `_components/` - Page-specific components (underscore prefix excludes from routing)

**Example Structure**:
```
app/
├── (workspace)/
│   ├── dashboard/
│   │   ├── page.tsx              # /dashboard route
│   │   ├── loading.tsx           # Loading state
│   │   └── _components/          # Dashboard-specific components
│   │       └── stats-card.component.tsx
│   └── layout.tsx                # Workspace layout (sidebar, etc.)
└── layout.tsx                    # Root layout
```

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
- i18n provider configured in `app/providers/i18n-provider.tsx`

```tsx
// ✅ Good - Client Component
'use client'
import { useTranslation } from 'react-i18next'

export default function Header() {
  const { t } = useTranslation()
  return <h1>{t('dashboard.title')}</h1>
}

// ❌ Bad
return <h1>Dashboard</h1>
```

**Note**: `useTranslation` hook requires 'use client' directive.

---

## 7. State Management

| State Type   | Solution                          |
| ------------ | --------------------------------- |
| Server state | TanStack Query (via tRPC)         |
| Client state | Zustand                           |
| URL state    | URL params (for filters, sorting) |

### tRPC with TanStack Query

Import both `trpc` and `trpcOptions` from `@/utils/trpc.utils`:

```tsx
import { queryClient, trpc, trpcOptions } from '@/utils/trpc.utils'
```

**Use `trpcOptions` for query/mutation options:**

```tsx
// Queries
const { data } = useSuspenseQuery(trpcOptions.tasks.getAll.queryOptions())
const { data } = useQuery(trpcOptions.dashboard.get.queryOptions())

// Mutations
const mutation = useMutation(trpcOptions.tasks.create.mutationOptions({
  onSuccess: () => { /* ... */ }
}))
```

**Use `trpc` for query keys (cache invalidation):**

```tsx
queryClient.invalidateQueries({ queryKey: trpc.tasks.getAll.queryKey() })
```

**Common mistake:** Using `trpc.*.queryOptions()` or `trpc.*.mutationOptions()` - these don't work correctly. Always use `trpcOptions` for options.

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
