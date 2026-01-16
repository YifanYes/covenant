# Arq Coding Standards & Best Practices

## 1. Architecture & Technologies

The project is a monorepo managed with workspaces:

- **/shared**: Shared logic, Zod schemas, and tRPC types. Essential for end-to-end type safety.
- **/front**: React 19 + Vite + Tailwind CSS v4.
- **/server**: Bun + tRPC + Fastify + Prisma + PostgreSQL. Follows a layered architecture:
  - **Routers**: Protocol handling and validation.
  - **Services**: Business logic and orchestration.
  - **Repositories**: Direct data access using Prisma.
  - **ServiceFactory**: Lazily initializes and provides services to the request context.

## 2. Naming Conventions

- **Files**: `kebab-case` with subdomain suffix (e.g., `objective-card.component.tsx`, `auth.store.ts`).
- **Folders**: `kebab-case` (e.g., `suspense-fallbacks/`, `objective-card/`).
- **Hooks**: `kebab-case` with `use-` prefix (e.g., `use-theme.ts`). Exception to subdomain suffix rule.
- **Layouts**: `kebab-case` without suffix (e.g., `app-layout.tsx`). Exception to subdomain suffix rule.
- **Server Routers**: `dot.export` pattern (e.g., `tasks.router.ts`).
- **Variables & Functions**: `camelCase` consistently across the codebase.

### File Subdomain Suffixes

| Type             | Suffix           | Example                     |
| ---------------- | ---------------- | --------------------------- |
| Components       | `.component.tsx` | `app-sidebar.component.tsx` |
| Views/Pages      | `.page.tsx`      | `dashboard.page.tsx`        |
| Utilities        | `.utils.ts`      | `objective-card.utils.ts`   |
| Models           | `.model.ts`      | `objective-card.model.ts`   |
| Config/Constants | `.config.ts`     | `theme.config.ts`           |
| Libraries        | `.lib.ts`        | `config.lib.ts`             |
| Stores           | `.store.ts`      | `auth.store.ts`             |
| Types            | `.types.ts`      | `colors.types.ts`           |

## 3. Frontend Architecture

### Directory Structure

```
front/src/
├── components/          # ONLY shared/reusable components
│   ├── ui/              # Shadcn primitives
│   ├── common/          # Shared non-ui components
│   ├── forms/           # Form-related components
│   ├── [domain]/        # Domain-specific components shared between domains (tasks, habits, objectives, etc.)
│   ├── auth/            # ONLY PrivateRoute (used by router)
│   ├── skeletons/       # Loading skeletons
│   └── suspense-fallbacks/
├── views/               # Each view in its own kebab-case folder
│   ├── adventure/       # Adventure domain (grouped pages)
│   │   ├── adventure-history/
│   │   ├── adventure-inventory/
│   │   ├── adventure-store/
│   │   ├── mission-detail/
│   │   └── components/  # Shared adventure components
│   ├── auth/            # Auth domain (grouped pages)
│   │   ├── login/
│   │   ├── sign-up/
│   │   ├── onboarding/
│   │   └── components/  # Shared auth components
│   ├── dashboard/       # Individual view folders
│   ├── habits/
│   ├── objectives/
│   ├── tasks/
│   └── settings/
├── hooks/               # Custom React hooks (use-*.ts)
├── stores/              # Zustand stores (*.store.ts)
├── layouts/             # Layout components (no suffix)
├── styles/              # Design tokens and global styles
│   ├── tokens.css       # Tailwind theme and CSS variables
│   └── ...
├── lib/                 # External library configs (*.lib.ts)
├── utils/               # Domain utilities (*.utils.ts)
└── types/               # Global type definitions (*.types.ts)
```

### Component/View Folder Structure (4 Subdomains)

Each component or view lives in a **kebab-case folder** with up to 4 optional subdomain files:

```
component-name/
├── component-name.config.ts     # Constants, configuration
├── component-name.utils.ts      # Helper methods
├── component-name.model.ts      # Types/interfaces (except FC props)
└── component-name.component.tsx # Main component (FC props defined here)
```

For views/pages:

```
dashboard/
├── dashboard.config.ts
├── dashboard.utils.ts
├── dashboard.model.ts
└── dashboard.page.tsx
```

Subdomain files are optional—simple components may only need `.component.tsx`.

### Best Practices

- **Component Structure**: Use atomic components and base styles on `shadcn/ui`.
- **Styling**: Use Tailwind CSS v4. For dynamic classes, use the `cn()` utility (`clsx` + `tailwind-merge`).
- **Internationalization**: Always use `i18next` for user-facing strings. Do not hardcode text in components. Add the translation keys to `front/public/locales/en/translation.json` and `front/public/locales/es/translation.json`.
- **Forms**: Use `react-hook-form` with `zod` resolvers for validation.
- **Type Safety**: Avoid `any` at all costs. Use proper TypeScript interfaces and types.
- **Icons**: Use `@nsmr/pixelart-react` for icons.
- **Dialogs**: Use `BaseFormDialog` for forms and `BaseConfirmDialog` for alerts/confirmations (found in `@/common`). Avoid using `Dialog` or `AlertDialog` directly in views to maintain UI consistency.
- **Styling Tokens**: Centralize all design tokens (colors, tiers, rarities) in `src/styles/tokens.css`. Reference them via Tailwind utilities (e.g., `text-tier-1`, `border-rarity-rare`).

### Architecture Guidelines

#### When to Use Folder Structure

Not every component needs the 4-subdomain split:

- **Single file**: Use for simple components with no shared logic (< 150 lines, e.g., `button.component.tsx`)
- **Folder with subdomains**: Use when you need to split logic into `.utils.ts`, `.model.ts`, or `.config.ts` files (e.g., `areas-distribution/`)

#### Function Components & Direct Exports

All UI and domain components **must use direct default function exports** in their primary file to maintain compatibility with standard React toolchains (e.g., `React.lazy`) and improve IDE discoverability. Avoid `const` exports for the main component.

- **Component File**: `export default function ObjectiveCard() { ... }`
- **Consumer**: `import ObjectiveCard from '@/objectives/objective-card.component'`
- **Consumer (Multiple)**:
  ```ts
  import ObjectiveCard from '@/objectives/objective-card.component'
  import CreateObjectiveDialog from '@/objectives/create-objective-dialog.component'
  ```

#### Function Components & Direct Exports

All UI and domain components **must use direct default function exports** instead of `const` arrow functions. This ensures better compatibility with React toolchains and improves readability.

- **Good**: `export default function MyComponent() { ... }`
- **Avoid**: `const MyComponent = () => { ... }` then `export default MyComponent`

#### Component Relocation & Colocation

1. **Global/Shared Components**: Live in `src/components/[domain]/`. These are components used across multiple unrelated views or domains (e.g., `ui/`, `common/`, `forms/`, `calendars/`).
2. **Domain-Shared Components**: Components shared between views within the same domain go in the domain's `components/` folder:
   ```
    views/adventure/
    ├── adventure-history/
    ├── adventure-store/
    └── components/              # Shared across adventure views
        ├── tier-badge.component.tsx
        └── combat-log.component.tsx
   ```
3. **View-Local Components**: Components used exclusively by a single view MUST be in a `components/` folder within that view's directory:
   ```
    views/dashboard/
    ├── dashboard.page.tsx
    └── components/              # Only used by dashboard
        ├── areas-distribution/
        └── upcoming-tasks/
   ```
4. **General Colocation**: Keep related logic (.utils, .model, .config) together within the component/view folder.

#### Reducing Import Verbosity

1. **Path Aliases**: Use descriptive aliases to point to high-level directories:
   - `@/ui` → `src/components/ui/`
   - `@/common` → `src/components/common/`
   - `@/forms` → `src/components/forms/`
   - `@/stores`, `@/lib`, `@/utils`, `@/layouts`, `@/styles`
2. **Deep Imports**: Use explicit deep imports via aliases:
   ```ts
   import Button from '@/ui/button.component'
   import { Card, CardContent } from '@/ui/card.component'
   ```
3. **View-Local Imports**: Use relative paths for view-local components:
   ```ts
   // views/dashboard/dashboard.page.tsx
   import UpcomingTasks from './components/upcoming-tasks/upcoming-tasks.component'
   ```

#### Colocation Principle

Keep related files together:

- **Good**: `components/tasks/create-task-dialog.component.tsx` (dialog lives with task components)
- **Avoid**: Separate `dialogs/` folder far from the domain it serves

## 4. Backend & Type Safety

- **Layered Architecture**:
  - **Routers** must be lean. They only handle input validation (via Zod) and call service methods.
  - **Services** contain business logic. They should be class-based and receive their dependencies (like repositories or other services) via constructor injection.
  - **Repositories** handle Prisma queries. Each entity (e.g., Task, Habit) should have its own repository in `server/repositories`.
- **Dependency Injection**: Use `server/services/service.factory.ts` to manage service instantiation. Access services in tRPC procedures via `ctx.services`.
- **Source of Truth**: All Zod schemas MUST be in the `@shared` workspace. Use `z.infer` to generate TypeScript types from these schemas to ensure end-to-end type safety.
- **Database**: Use Prisma for all database operations. After schema changes, push them to Supabase using `npx prisma db push` and then run `npx prisma generate`. We're in development phase, so there's no production environment.
- **Type Inference**: Prefer inferring types from Zod schemas in `shared/schemas` rather than declaring manual interfaces in service files.

## 5. State Management

- **Server State**: Use TanStack Query (via tRPC) for all server-side data fetching and mutations.
- **Client State**: Use `zustand` for global client-side state.
- **URL State**: Use the URL for filtering, sorting, or view state whenever possible to allow deep linking.

## 6. Spec-Driven Development (SDD)

We follow SDD principles:

1.  **Define the Spec**: Before writing code, document the change in `docs/specs/`.
2.  **Implementation**: Develop following the approved specification.
3.  **Validation**: Verify that the code meets the initial spec.

## 7. Code Style (Formatting)

### Comments

Don't use any comments unless it's necessary to explain the logic or add context.

### General (Prettier)

We use **Prettier** for consistency. Key rules:

- **Semicolons**: No (`semi: false`)
- **Quotes**: Single (`singleQuote: true`)
- **Trailing Commas**: None (`trailingComma: "none"`)
- **Print Width**: 120 characters

## 8. Git Conventions

### Commits

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat`: New functionality.
- `fix`: Bug correction.
- `docs`: Documentation changes.
- `refactor`: Code change that neither fixes a bug nor adds a feature.
- `chore`: Maintenance tasks (dependencies, build scripts, etc.).

### Branches

- `main`: Production branch.
- `feature/name`: For new features.
- `fix/name`: For bug fixes.

## 9. Agent Design Patterns

1.  **Stateless Tools**: Tools should generally be stateless. Pass necessary context (IDs, tokens) as arguments.
2.  **Fail Gracefully**: Tools should return error messages or status codes rather than crashing.
3.  **Deep Think Simulation**: Include comments or design docs outlining the "thought process" for complex logic.
