# Covenant

A gamified productivity platform with RPG-style progression. Manage tasks, habits, and objectives while advancing a character through a dark fantasy narrative inspired by biblical themes.

## Prerequisites

- [Node.js](https://nodejs.org/) `>=22.12.0`
- [pnpm](https://pnpm.io/) `10.4.1` (enforced via `packageManager` field)
- PostgreSQL database

## Installation

All commands are run from the project root.

1. Clone the repository:

```bash
git clone https://github.com/your-username/covenant.git
cd covenant
```

2. Install dependencies:

```bash
pnpm install
```

> `postinstall` automatically runs `prisma generate`.

3. Configure environment variables:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your database credentials and other secrets.

4. Set up the database:

```bash
pnpm db:push
```

## Development

Start the single Next.js dev server (backend runs as API routes, not a separate process):

```bash
pnpm dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

## Project Structure

```
covenant/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Onboarding, login, sign-up
│   │   ├── (workspace)/        # Main app pages (dashboard, tasks, habits, etc.)
│   │   ├── (landing)/          # Marketing pages (story, mechanics, roadmap, news)
│   │   ├── (card)/             # Character card pages
│   │   ├── api/                # API routes (tRPC, Better Auth, health, logs)
│   │   ├── _layouts/           # Layout components (RPGLayout, ProductivityLayout)
│   │   └── providers/          # Context providers
│   ├── components/             # Shared and page-specific UI components
│   │   ├── ui/                 # shadcn/ui primitives
│   │   ├── auth/               # Auth-related components
│   │   ├── combat/             # Combat system UI
│   │   ├── tasks/              # Task management components
│   │   └── ...
│   ├── server/                 # Backend (tRPC + business logic)
│   │   ├── routers/            # tRPC router definitions (thin, delegate to services)
│   │   ├── services/           # Business logic layer (class-based, constructor-injected)
│   │   ├── repositories/       # Data access layer (Prisma, zero business logic)
│   │   ├── __tests__/          # Vitest unit/integration tests
│   │   ├── emails/             # React Email templates
│   │   ├── lib/                # Server-side utilities
│   │   └── utils/              # Helper utilities
│   ├── shared/                 # Shared code (Zod schemas, types, constants)
│   ├── stores/                 # Zustand client state (slice pattern)
│   ├── hooks/                  # Custom React hooks (use-*.ts)
│   ├── lib/                    # Utility libraries
│   ├── utils/                  # Helper utilities
│   └── styles/                 # Global styles and Tailwind config
├── prisma/                     # Prisma schema and migrations
├── public/                     # Static assets and i18n translation files
├── generated/                  # Prisma client output (custom, not in node_modules)
├── docs/                       # Documentation
│   ├── specs/                  # Technical specifications (SDD)
│   ├── lore/                   # Game lore, worldbuilding, mechanics
│   └── product/                # Product and infrastructure docs
├── mission.md                  # Project mission and pillars
├── roadmap.md                  # Project timeline and phases
├── DESIGN.md                   # Visual identity, faction palettes, UI principles
├── CLAUDE.md                   # Detailed architecture and conventions
└── AGENTS.md                   # Compact instructions for AI agents
```

## Architecture

Covenant is a single Next.js 16 monolith. The backend is embedded and runs as Next.js API routes, not a separate process.

### Request Flow

```
Request → tRPC Router (validation) → Service (business logic) → Repository (data access)
```

### Backend Layers

1. **tRPC Routers** (`src/server/routers/`): Handle incoming requests, validation, and protocol logic. They are "thin" and delegate business logic to services. Use `protectedProcedure` for auth routes, `publicProcedure` for public routes.
2. **Services** (`src/server/services/`): Class-based, constructor-injected. Contain core business logic. Registered in `ServiceFactory` (`src/server/services/service.factory.ts`) with lazy init (`??=`). Layered: L1 (repo-only), L2 (repo + L1), L3 (complex).
3. **Repositories** (`src/server/repositories/`): Extend `BaseRepository<T>` or `UserScopedRepository<T>`. One per entity. Encapsulate all Prisma database operations — zero business logic.
4. **Context** (`src/server/context.ts`): Creates `ServiceFactory(prisma)`, attaches user session from Better Auth.

### Frontend

- **Route groups**: `(auth)` for onboarding/login, `(workspace)` for the main app, `(landing)` for marketing pages.
- **Dual layout**: Workspace layout selects `RPGLayout` (quests, inventory, shop) vs `ProductivityLayout` (dashboard, tasks, habits, objectives) based on pathname.
- **State**: Server state via TanStack Query + tRPC; client state via Zustand with slice pattern (`src/stores/`).
- **Static pages**: MDX files in `app/` for static content (news, mechanics, roadmap, etc.).

### tRPC Client Usage

Two exports from `@/utils/trpc.utils`:

- **`trpcOptions`**: Use for `queryOptions()` / `mutationOptions()` with TanStack Query hooks.
- **`trpc`**: Use **only** for `queryKey()` when invalidating queries.

```tsx
const { data } = useSuspenseQuery(trpcOptions.dashboard.get.queryOptions())
const mutation = useMutation(
  trpcOptions.habits.create.mutationOptions({
    onSuccess: () => queryClient.invalidateQueries({ queryKey: trpc.habits.getAll.queryKey() })
  })
)
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 16.1.4, React 19.2.3, TypeScript 5.9.3 |
| **Styling** | TailwindCSS v4, shadcn/ui, Framer Motion |
| **State** | TanStack Query, Zustand |
| **Backend** | tRPC 11, Prisma 7.3.0, PostgreSQL |
| **Auth** | Better Auth |
| **Validation** | Zod 4.3.6 |
| **i18n** | i18next, react-i18next |
| **Testing** | Vitest 4.0.18 |
| **Email** | React Email + Brevo |
| **Icons** | pixelarticons |
| **Charts** | Recharts |
| **Logging** | Pino |

## Database / Prisma

- **Schema**: `prisma/schema.prisma`
- **Client output**: `generated/prisma` (custom output, do not import from `@prisma/client` directly)
- **Config**: Reads `DIRECT_URL` from `.env.local` via `prisma.config.ts`

### Commands

```bash
pnpm db:push        # Push schema changes to database (prisma db push)
pnpm db:generate    # Create a new migration (prisma migrate dev)
pnpm db:migrate     # Deploy migrations (prisma migrate deploy)
npx prisma generate # Regenerate Prisma client only
```

## Testing

The project uses [Vitest](https://vitest.dev/) for unit and integration testing in a Node environment.

- **Pattern**: `src/server/__tests__/**/*.test.ts`
- **Fixtures**: `src/server/__tests__/fixtures/` use override pattern: `mockCharacter(overrides)`
- **Services**: Mock repositories via constructor injection

### Commands

```bash
pnpm test           # Run tests
pnpm test:coverage  # Generate coverage report
```

### Single Test File

```bash
pnpm vitest run src/server/__tests__/services/character.service.test.ts
```

## Building for Production

```bash
pnpm build    # Build the Next.js app
pnpm start    # Start the production server
```

## Verification Order

After making changes, run in this order:

```bash
pnpm lint
npx tsc --noEmit   # Required after type/interface changes
pnpm test          # Must pass before considering task complete
```

## Code Conventions

- **Format**: `.prettierrc` — no semicolons, single quotes, no trailing commas, `printWidth: 120`
- **No `any`**: Use `unknown` with type guards (ESLint rule is off for legacy, but new code should avoid `any`)
- **File naming**: kebab-case with suffixes (`.component.tsx`, `.utils.ts`, `.router.ts`, `.store.ts`)
- **Hooks**: `use-*.ts`
- **Components**: Direct default export, Server Components by default, `'use client'` only for hooks/events/browser APIs
- **Types from Zod**: `z.infer<typeof schema>`
- **Imports**: Use path aliases (`@/*`, `@shared/*`, `@ui/*`) — never relative imports
- **Git commits**: Conventional format (`feat:`, `fix:`, `docs:`, `test:`, `build:`), lowercase description, no period at end

## Internationalization (i18n)

- **Supported languages**: English (`en`), Spanish (`es`)
- **Translation files**: `public/locales/{lang}/translation.json`
- **Rule**: NEVER hardcode user-facing strings. Always use `useTranslation()`.
- When adding new keys, add them to **both** `en` and `es` files.

## Spec-Driven Development (SDD)

This project follows **Spec-Driven Development** principles:

1. **Define the Spec**: Before implementing complex features, a technical specification is created in `docs/specs/`.
2. **Implementation**: Development follows the approved specification strictly.
3. **Validation**: Post-implementation verification to ensure the code meets the spec requirements.

## Environment Variables

Key variables (see `.env.example` for full list):

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `DIRECT_URL` | Direct PostgreSQL connection (used by Prisma) |
| `NEXT_PUBLIC_APP_URL` | Public app URL (e.g., `http://localhost:3000`) |
| `JWT_SECRET` | Secret for JWT signing |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth credentials |
| `BREVO_API_KEY` | Brevo (Sendinblue) API key for emails |
| `FROM_EMAIL` | Sender email address |
| `LOG_LEVEL` | Logging level: `debug`, `info`, `warn`, `error` |

## Important Gotchas

- `next.config.ts` has `serverExternalPackages: ['pg', 'pino', 'pino-pretty', 'node-cron']` and MDX support via `@next/mdx`.
- Prisma client lives at `@/generated/prisma` — do not import from `@prisma/client` directly.
- Tests mock repositories by passing them directly into service constructors (no DI container).
- Avoid `Omit<>` patterns that break implicit tRPC type resolution.

## Documentation

| File | Purpose |
|------|---------|
| `AGENTS.md` | Compact instructions for AI agents |
| `CLAUDE.md` | Detailed architecture and conventions |
| `DESIGN.md` | Visual identity, faction palettes, UI principles |
| `mission.md` | Project mission and pillars |
| `roadmap.md` | Project timeline and phases |
| `docs/specs/` | Technical specifications (SDD) |
| `docs/lore/` | Game lore, worldbuilding, mechanics |
| `docs/product/` | Product and infrastructure docs |

## License

[MIT](LICENSE)
