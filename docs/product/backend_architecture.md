# Backend Architecture

> **Last Updated**: 2026-05-10

## Stack

| Layer | Tech | Version |
|---|---|---|
| **Runtime** | Node.js | 22+ |
| **Framework** | Next.js API routes | 16.2.6 |
| **API** | tRPC | 11.8.1 |
| **ORM** | Prisma | 7.3.0 |
| **DB Driver** | pg (native pool) | 8.17.2 |
| **Auth** | Better Auth | ~1.6.9 |
| **Validation** | Zod | 4.3.6 |
| **Logging** | Pino | 10.3.1 |
| **Caching** | Upstash Redis | 1.38.0 |
| **Rate Limiting** | Upstash Ratelimit | 2.0.8 |
| **Email** | React Email + Brevo | @react-email/* |
| **Testing** | Vitest | 4.0.18 |
| **Error Tracking** | Sentry | 10.52.0 |
| **Cron** | node-cron | 4.2.1 |

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
│       ├── doctrine-buffs.ts
│       ├── attack-resolution.ts
│       ├── enemy-ai.ts
│       ├── rewards.ts
│       └── tactical-doctrine.ts
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

| Config | Limit | Window | Used for |
|---|---|---|---|
| `auth` | 5 requests | 60s | sign-in, sign-up |
| `write` | 30 requests | 60s | CRUD mutations |
| `strict` | 10 requests | 60s | sensitive ops |
| `combat` | 60 requests | 60s | combat actions |

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

| Model | Purpose |
|---|---|
| `User` | Auth user + preferences (theme, locale, tutorialCompletedAt) |
| `Session` | Better Auth session (token hashed) |
| `Account` | OAuth provider link |
| `Verification` | Email verification tokens |
| `Character` | Player RPG character (class, gold, inventory, loadout) |
| `CharacterClass` | Character stats per class (health, mana, equippedDoctrines) |
| `CharacterQuest` | Active quest progress (status, combatStats JSON) |
| `CombatEnemy` | Quest enemy instance (health, combatLog JSON) |
| `Objective` | Goal/project (dueDate, many-to-many with areas/tasks/habits) |
| `Area` | Context/category (name, color, icon) |
| `Task` | To-do (status, order, effort/impact, dueDate) |
| `Habit` | Recurring behavior (recurrence, timespan, soft-delete) |
| `HabitCompletion` | Habit log entry |
| `JournalEntry` | Diary entry (mood, color, unique per userId+day) |

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

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | Prisma connection (pooled) |
| `DIRECT_URL` | Yes | Direct connection (migrations) |
| `NEXT_PUBLIC_APP_URL` | Yes | App base URL |
| `JWT_SECRET` | Yes | Session signing (Better Auth) |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth |
| `CRON_SECRET` | Yes | Cron job auth |
| `BREVO_API_KEY` | Optional | Transactional email |
| `FROM_EMAIL` | Optional | Sender address |
| `UPSTASH_REDIS_REST_URL` | Optional | Distributed cache/rate-limit |
| `UPSTASH_REDIS_REST_TOKEN` | Optional | Distributed cache/rate-limit |

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

## What We Are NOT Doing

- No DI container (InversifyJS, etc.) — ServiceFactory pattern only
- No CQRS / command bus / domain events
- No separate value objects
- No separate Bun/Fastify process — everything in Next.js API routes
- No Supabase — replaced with PostgreSQL + Better Auth
