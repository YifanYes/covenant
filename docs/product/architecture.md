# Architecture

> **Last Updated**: 2026-05-13

This document covers both the frontend and backend architecture for Covenant.

---

# Frontend Architecture

## Stack

| Layer | Tech | Version |
|---|---|---|
| **Framework** | Next.js App Router | 16.2.6 |
| **Language** | TypeScript (strict) | 5.9.3 |
| **UI Library** | React | 19.2.3 |
| **Styling** | Tailwind CSS v4 | 4.x |
| **UI Primitives** | Radix UI | 13 packages |
| **Server State** | React Query | 5.90.20 |
| **Client State** | Zustand | 5.0.10 |
| **Forms** | react-hook-form + Zod | 7.71.1 / 4.3.6 |
| **Routing** | Next.js App Router | built-in |
| **API Client** | tRPC | 11.8.1 |
| **i18n** | i18next | 25.8.0 |
| **Animations** | Framer Motion | 12.34.3 |
| **Charts** | Recharts | 3.7.0 |
| **Date** | dayjs | 1.11.19 |
| **Error Tracking** | Sentry | 10.52.0 |

## Route Structure (App Router)

```
src/app/
├── (auth)/             # Public auth pages
│   ├── sign-up/
│   ├── login/
│   ├── forgot-password/
│   ├── reset-password/
│   ├── onboarding/
│   └── _components/   # Page-local components
├── (workspace)/        # Protected app pages
│   ├── dashboard/
│   ├── calendar/
│   ├── tasks/
│   ├── habits/
│   ├── objectives/
│   ├── quests/
│   ├── inventory/
│   ├── map/            # Combat view
│   ├── journaling/
│   ├── shop/
│   ├── settings/
│   ├── productivity-layout.tsx
│   ├── rpg-layout.tsx
│   └── layout.tsx      # Shared nav + auth guard
├── (landing)/          # Marketing pages (SSG, SEO)
├── (card)/             # Public card pages [slug]
├── api/
│   ├── auth/[...all]/  # Better Auth handler
│   ├── trpc/[...trpc]/ # tRPC endpoint
│   ├── health/
│   └── logs/
└── providers/
    ├── trpc-provider.tsx
    └── i18n-provider.tsx
```

Auth guarding: enforced via `protectedProcedure` in tRPC context — no `middleware.ts` file.

## Component Organization

```
src/components/
├── ui/             # Radix + custom base components (29 files)
├── common/         # App-wide wrappers (theme, Sentry, layout)
├── forms/          # Form-specific components
├── auth/           # Auth flow components
├── combat/         # Combat UI (dice, enemies, log) — 12 files
├── tasks/          # Task display components
├── calendars/      # Calendar views
├── tutorial/       # Tutorial overlay
├── skeletons/      # Loading states
└── suspense-fallbacks/
```

Page-local components live in `src/app/(workspace)/<page>/_components/`.

### Naming Conventions

| Thing | Pattern | Example |
|---|---|---|
| File | `domain-name.component.tsx` | `enemy-card.component.tsx` |
| Hook | `use-name.hook.ts` | `use-combat.hook.ts` |
| Store | `name.store.ts` | `tutorial.store.ts` |
| Schema | `name.schemas.ts` | `character.schemas.ts` |
| Util | `name.utils.ts` | `query-invalidation.utils.ts` |

Exports: named exports (`export function ComponentName()`).

## Client State (Zustand)

5 stores in `src/stores/`:

| Store | Persisted | Purpose |
|---|---|---|
| `auth.store.ts` | Yes (`covenant-store`) | email, userId, signOut |
| `user-preferences.store.ts` | Yes | theme, locale |
| `calendar.store.ts` | No | selected month/date |
| `tasks.store.ts` | No | view filters/sorts |
| `tutorial.store.ts` | No | tutorial step/state |

## API Integration

tRPC v11 + React Query v5. Type-safe end-to-end from Zod schemas through tRPC to React component.

```
src/utils/trpc.utils.ts    # createTRPCReact + httpBatchLink
src/app/providers/trpc-provider.tsx  # QueryClient + TRPCProvider
```

## Path Aliases

```json
{
  "@/*": ["./src/*"],
  "@/components/*": ["./src/components/*"],
  "@/ui/*": ["./src/components/ui/*"],
  "@/stores/*": ["./src/stores/*"],
  "@/lib/*": ["./src/lib/*"],
  "@/hooks/*": ["./src/hooks/*"],
  "@/utils/*": ["./src/utils/*"],
  "@/types/*": ["./src/types/*"],
  "@/server/*": ["./src/server/*"],
  "@shared/*": ["./src/shared/*"]
}
```

Deep imports preferred over barrel files — better tree-shaking, clearer ownership.

## Styling

- Tailwind v4 (CSS-first config, Oxide engine)
- Class-based dark mode
- Faction theme system via CSS classes (`use-faction-theme.ts`)
- `clsx` utility at `@/lib/cn.lib.ts`
- No CSS-in-JS

## Shared Isomorphic Code

`src/shared/` contains code used by both client and server:

```
shared/
├── schemas/     # Zod validation schemas (input/output)
├── constants/   # Game constants (classes, enemies, quests, items, factions)
└── types/       # TypeScript types (character, combat, ability, etc.)
```

## SSR / SEO

Next.js App Router gives per-route rendering control:
- `(landing)/` — SSG, fully crawlable
- `(workspace)/` — mostly CSR (game state), auth-gated
- `(card)/[slug]` — SSR, public info pages

Landing page SEO problem that motivated infrastructure redesign is **solved** — no separate Astro project needed.

## What We Are NOT Doing (Frontend)

- No separate React SPA (Vite) — Next.js handles all frontend
- No Astro landing site — landing is part of the Next.js app
- No Redux / Context API for state — Zustand only
- No styled-components / emotion — Tailwind only
- No barrel `index.ts` files — deep imports only
- No `middleware.ts` for auth — tRPC `protectedProcedure` handles it

---

# Backend Architecture

## Stack

| Layer              | Tech                | Version         |
| ------------------ | ------------------- | --------------- |
| **Runtime**        | Node.js             | 22+             |
| **Framework**      | Next.js API routes  | 16.2.6          |
| **API**            | tRPC                | 11.8.1          |
| **ORM**            | Prisma              | 7.3.0           |
| **DB Driver**      | pg (native pool)    | 8.17.2          |
| **Auth**           | Better Auth         | ~1.6.9          |
| **Validation**     | Zod                 | 4.3.6           |
| **Logging**        | Pino                | 10.3.1          |
| **Caching**        | Upstash Redis       | 1.38.0          |
| **Rate Limiting**  | Upstash Ratelimit   | 2.0.8           |
| **Email**          | React Email + Brevo | @react-email/\* |
| **Testing**        | Vitest              | 4.0.18          |
| **Error Tracking** | Sentry              | 10.52.0         |
| **Cron**           | node-cron           | 4.2.1           |

## Architecture Layers

```
┌─────────────────────────────────┐
│       tRPC Routers              │  ← Input validation (Zod) + call services
└─────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│       Service Factory           │  ← Lazy-init, single instance per request
└─────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│           Services              │  ← All business logic (classes)
└─────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│         Repositories            │  ← Reusable Prisma queries
└─────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│       Prisma + pg pool          │  ← ORM + connection pool
└─────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│          PostgreSQL             │
└─────────────────────────────────┘
```

## Folder Structure

```
src/server/
├── routers/                # tRPC procedures (input/output only)
│   ├── character.router.ts
│   ├── quest.router.ts
│   ├── tasks.router.ts
│   ├── habits.router.ts
│   ├── objectives.router.ts
│   ├── areas.router.ts
│   ├── journal.router.ts
│   ├── dashboard.router.ts
│   ├── auth.router.ts
│   ├── store.router.ts
│   └── kill-record.router.ts
│
├── services/               # Business logic (classes)
│   ├── service.factory.ts  # Lazy DI factory (single instance per request)
│   ├── character.service.ts
│   ├── quest.service.ts
│   ├── combat.service.ts
│   ├── task.service.ts
│   ├── habit.service.ts
│   ├── objective.service.ts
│   ├── area.service.ts
│   ├── dashboard.service.ts
│   ├── journal.service.ts
│   ├── store.services.ts
│   ├── auth.service.ts
│   ├── email.service.ts
│   ├── dice.service.ts
│   ├── kill-record.service.ts
│   └── combat/
│       ├── buff-management.service.ts
│       └── index.ts
│
├── repositories/           # Reusable Prisma queries
│   ├── base.repository.ts  # Shared find/create/update patterns
│   ├── character.repository.ts
│   ├── character-quest.repository.ts
│   ├── combat-enemy.repository.ts
│   ├── user.repository.ts
│   ├── task.repository.ts
│   ├── habit.repository.ts
│   ├── objective.repository.ts
│   ├── area.repository.ts
│   └── journal.repository.ts
│
├── utils/
│   ├── character.utils.ts
│   └── combat/             # Pure combat logic modules
│       ├── dice.ts
│       ├── ability-buffs.ts
│       ├── attack-resolution.ts
│       ├── enemy-ai.ts
│       └──  rewards.ts
│
├── lib/                    # Infrastructure
│   ├── auth.ts             # Better Auth config
│   ├── prisma.ts           # PrismaClient + session hashing extension
│   ├── redis.ts            # Upstash Redis client (optional, fail-open)
│   ├── logger.ts           # Pino structured logging
│   ├── rate-limiter.ts     # Upstash-backed rate limiting
│   ├── account-lockout.ts  # Brute-force protection (Redis)
│   ├── session-token.ts
│   ├── session-hash.ts
│   ├── auth-locale.utils.ts
│   └── i18n-server.ts
│
├── emails/                 # Transactional email templates
│   ├── render-email.tsx
│   ├── verification.email.tsx
│   ├── password-reset.email.tsx
│   └── components/
│
├── __tests__/              # Vitest tests
│   ├── services/
│   ├── repositories/
│   ├── routers/
│   ├── lib/
│   └── utils/
│
├── context.ts              # tRPC context factory
├── trpc.ts                 # tRPC base (publicProcedure, protectedProcedure)
├── router.ts               # Root tRPC router
├── trpc-caller.ts
├── config.ts               # Server env validation (Zod)
└── scripts/
    └── db-push-prod.ts
```

## Service Factory (DI Pattern)

Services are lazy-initialized singletons within a request — no DI container required.

```typescript
// services/service.factory.ts
export class ServiceFactory {
  private _characterService?: CharacterService

  get characterService() {
    if (!this._characterService) {
      this._characterService = new CharacterService(this.prisma, this.repositories)
    }
    return this._characterService
  }
}
```

Factory is created in `context.ts` and passed to all tRPC procedures via `ctx.services`.

## tRPC Middleware

```typescript
// trpc.ts
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session) throw new TRPCError({ code: 'UNAUTHORIZED' })
  return next({ ctx: { ...ctx, session: ctx.session } })
})
```

Rate limiting applied per-procedure:

| Config   | Limit       | Window | Used for         |
| -------- | ----------- | ------ | ---------------- |
| `auth`   | 5 requests  | 60s    | sign-in, sign-up |
| `write`  | 30 requests | 60s    | CRUD mutations   |
| `strict` | 10 requests | 60s    | sensitive ops    |
| `combat` | 60 requests | 60s    | combat actions   |

## Authentication (Better Auth)

Auth library: **Better Auth v1.6.9** (not Supabase, not custom JWT).

**Supported methods:**

- Email/password (with email verification, password reset)
- Google OAuth (trusted provider, auto-links verified emails)

**Security features:**

- Account lockout: 3 failures / 10s → locked (Redis-backed, `account-lockout.ts`)
- Session token hashing at DB layer (Prisma extension in `prisma.ts`)
- Optional Redis secondary session storage (distributed sessions)
- Password reset revokes all sessions
- Rate limiting on all auth endpoints

**Session storage:**

- Primary: PostgreSQL (`Session` table, managed by Better Auth)
- Secondary (optional): Upstash Redis (survives restarts, shared across replicas)

**Protected routes:** `(workspace)` group — checked via `ctx.session` in tRPC context.

## Database

**PostgreSQL** + Prisma 7.3 + `@prisma/adapter-pg`

```
Pool settings: max: 10, min: 1, idleTimeoutMillis: 30000
SSL: enabled in production (rejectUnauthorized: false)
Generated client: /generated/prisma
```

**Schema models (14):**

| Model             | Purpose                                                      |
| ----------------- | ------------------------------------------------------------ |
| `User`            | Auth user + preferences (theme, locale, tutorialCompletedAt) |
| `Session`         | Better Auth session (token hashed)                           |
| `Account`         | OAuth provider link                                          |
| `Verification`    | Email verification tokens                                    |
| `Character`       | Player RPG character (class, gold, inventory, loadout)       |
| `CharacterClass`  | Character stats per class (health, mana, equippedAbilities)  |
| `CharacterQuest`  | Active quest progress (status, combatStats JSON)             |
| `CombatEnemy`     | Quest enemy instance (health, combatLog JSON)                |
| `Objective`       | Goal/project (dueDate, many-to-many with areas/tasks/habits) |
| `Area`            | Context/category (name, color, icon)                         |
| `Task`            | To-do (status, order, effort/impact, dueDate)                |
| `Habit`           | Recurring behavior (recurrence, timespan, soft-delete)       |
| `HabitCompletion` | Habit log entry                                              |
| `JournalEntry`    | Diary entry (mood, color, unique per userId+day)             |

## Logging

Pino structured logging, server-side only.

- Dev: `pino-pretty` (human-readable)
- Prod: JSON to stdout
- Per-request child logger with `userId`

**Event types:** `AUTH_SIGNUP`, `AUTH_LOGIN`, `AUTH_FAILURE`, `LOCKOUT_TRIGGERED`, `EMAIL_SEND_FAILED`, etc.

## Email

React Email components rendered to HTML, sent via Brevo SMTP.

Templates:

- `verification.email.tsx` — email verification link
- `password-reset.email.tsx` — password reset link

Locale-aware: resolves user locale from user record or Accept-Language header.

## Environment Variables

Validated at startup with Zod (`src/server/config.ts`):

| Variable                   | Required | Purpose                        |
| -------------------------- | -------- | ------------------------------ |
| `DATABASE_URL`             | Yes      | Prisma connection (pooled)     |
| `DIRECT_URL`               | Yes      | Direct connection (migrations) |
| `NEXT_PUBLIC_APP_URL`      | Yes      | App base URL                   |
| `JWT_SECRET`               | Yes      | Session signing (Better Auth)  |
| `GOOGLE_CLIENT_ID`         | Yes      | Google OAuth                   |
| `GOOGLE_CLIENT_SECRET`     | Yes      | Google OAuth                   |
| `CRON_SECRET`              | Yes      | Cron job auth                  |
| `BREVO_API_KEY`            | Optional | Transactional email            |
| `FROM_EMAIL`               | Optional | Sender address                 |
| `UPSTASH_REDIS_REST_URL`   | Optional | Distributed cache/rate-limit   |
| `UPSTASH_REDIS_REST_TOKEN` | Optional | Distributed cache/rate-limit   |

## Testing

Vitest 4 — server and shared code only (no E2E, no frontend component tests).

```
src/server/__tests__/
├── services/    # CharacterService, etc.
├── repositories/ # Query correctness
├── routers/     # Procedure input/output
├── lib/         # Auth, rate-limiter, etc.
└── utils/       # Combat calculations
```

## What We Are NOT Doing (Backend)

- No DI container (InversifyJS, etc.) — ServiceFactory pattern only
- No CQRS / command bus / domain events
- No separate value objects
- No separate Bun/Fastify process — everything in Next.js API routes
- No Supabase — replaced with PostgreSQL + Better Auth
