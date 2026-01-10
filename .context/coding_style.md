# Arq Coding Standards & Best Practices

## 1. Architecture & Technologies

The project is a monorepo managed with workspaces:

- **/shared**: Shared logic, Zod schemas, and tRPC types. Essential for end-to-end type safety.
- **/front**: React 19 + Vite + Tailwind CSS v4.
- **/server**: Bun + tRPC + Fastify + Prisma + PostgreSQL.

## 2. Naming Conventions

- **Frontend Components**: `PascalCase` for files and component names (e.g., `ObjectiveCard.tsx`).
- **Hooks**: `camelCase` with the `use` prefix (e.g., `useTaskActions.ts`).
- **Files & Folders**: `kebab-case` for folders (e.g., `suspense-fallbacks/`) and `dot.export` for server routers (e.g., `tasks.router.ts`).
- **Variables & Functions**: `camelCase` consistently across the codebase.

## 3. Frontend Best Practices

- **Component Structure**: Use atomic components and base styles on `shadcn/ui`.
- **Styling**: Use Tailwind CSS v4. For dynamic classes, use the `cn()` utility (`clsx` + `tailwind-merge`).
- **Internationalization**: Always use `i18next` for user-facing strings. Do not hardcode text in components. Add the translation keys to `front/public/locales/en/translation.json` and `front/public/locales/es/translation.json`.
- **Forms**: Use `react-hook-form` with `zod` resolvers for validation.
- **Type Safety**: Avoid `any` at all costs. Use proper TypeScript interfaces and types.
- **Icons**: Use `@nsmr/pixelart-react` for icons.

## 4. Backend & Type Safety

- **tRPC Procedures**: Define all inputs and outputs using Zod schemas located in the `@arq/shared` workspace.
- **Shared Logic**: Place all Zod schemas, shared types, and constants in `/shared` to maintain end-to-end consistency.
- **Database**: Use Prisma for all database operations. After schema changes, push them to Supabase using `npx prisma db push` and then run `npx prisma generate`. We're in development phase, so there's no production environment.

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
