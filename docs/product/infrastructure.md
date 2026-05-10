# Infrastructure

> **Last Updated**: 2026-05-10

## Current Stack

| Layer | Tech | Notes |
|---|---|---|
| **Frontend + Backend** | Next.js 16 (App Router) | Single full-stack app |
| **Runtime** | Node.js 22+ | |
| **Database** | PostgreSQL | Self-hosted or managed |
| **ORM** | Prisma 7 + pg adapter | Connection pooling built-in |
| **Auth** | Better Auth v1.6.9 | Email/password + Google OAuth |
| **Caching / Rate Limiting** | Upstash Redis | Optional, fail-open |
| **Email** | React Email + Brevo SMTP | |
| **Error Tracking** | Sentry | Source map tunneling via `/monitoring` |
| **Logging** | Pino (JSON in prod) | |
| **Package Manager** | pnpm 10.4.1 | |

**Supabase has been fully removed.** PostgreSQL + Better Auth replaced Supabase Auth + Supabase DB. No Supabase SDK in the codebase.

## Architecture

Single Next.js process handles everything: SSR, API routes (tRPC + Better Auth), and static pages.

```
┌────────────────────────────────────────────────┐
│                   User Browser                  │
└────────────────────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────┐
│             Reverse Proxy (Caddy)               │
│  arq.app → Next.js (port 3000)                 │
│  api.arq.app → (or same Next.js, /api/*)        │
└────────────────────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────┐
│              Next.js 16 App                     │
│  /            → Landing (SSG)                   │
│  /app/*       → Workspace (CSR, auth-gated)     │
│  /api/auth/*  → Better Auth handler             │
│  /api/trpc/*  → tRPC endpoint                   │
│  /monitoring  → Sentry tunnel                   │
└────────────────────────────────────────────────┘
            │                    │
            ▼                    ▼
┌───────────────────┐  ┌──────────────────────────┐
│    PostgreSQL      │  │  Upstash Redis (optional) │
│  (Prisma + pg)    │  │  Rate-limit + sessions    │
└───────────────────┘  └──────────────────────────┘
```

## SEO

Next.js App Router solves the original CSR-only SEO problem:
- `(landing)/` routes — SSG, fully crawlable
- `(card)/[slug]` — SSR, public info pages
- `(workspace)/` — CSR, auth-gated (no SEO needed)

No separate Astro project required.

## Auth Architecture

Better Auth handles all auth flows:

- **Email/password**: verification email via Brevo, account lockout after 3 failed attempts
- **Google OAuth**: trusted provider, auto-links verified matching emails
- **Sessions**: stored in PostgreSQL, tokens hashed at DB layer; optional Redis secondary storage for distributed deployments
- **Password reset**: token sent via email, invalidates all sessions on use

See `src/server/lib/auth.ts` for full config.

## Deployment Options

### Option 1: Hetzner VPS (Recommended — lowest cost)

```yaml
# docker-compose.production.yml
services:
  postgres:
    image: postgres:16-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    deploy:
      resources:
        limits:
          memory: 1.5G

  app:
    build: .               # Next.js Dockerfile
    environment:
      - DATABASE_URL=postgresql://postgres:5432/arq
      - UPSTASH_REDIS_REST_URL=${UPSTASH_REDIS_REST_URL}
    deploy:
      resources:
        limits:
          memory: 1G

  caddy:
    image: caddy:2-alpine
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data

volumes:
  postgres_data:
  caddy_data:
```

```
# Caddyfile
arq.app, app.arq.app {
    reverse_proxy app:3000
}
```

**Hetzner CX22 (4GB RAM): ~€5/month total.**

### Option 2: Railway (Managed, easier ops)

```
Railway Project:
├── Service: app (Next.js, Dockerfile)
│   └── PORT: 3000
└── Plugin: PostgreSQL (~$7/month)

Upstash: Redis free tier (rate-limiting)

Total: ~$12-20/month
```

### Option 3: Vercel + Managed PostgreSQL

```
Vercel:
└── Next.js app (zero-config deploy)

Database:
└── Neon (serverless PostgreSQL, free 0.5GB)
    or Railway PostgreSQL ($7/month)

Upstash: Redis (rate-limiting + sessions)

Total: ~$0-15/month depending on traffic
```

Caveat: Vercel cold starts affect Edge/Serverless functions. Pino logging needs adaptation (no file system).

## Local Development

```yaml
# docker-compose.yml (DB only — app runs on host for speed)
services:
  postgres:
    image: postgres:16-alpine
    ports:
      - '5432:5432'
    environment:
      POSTGRES_USER: covenant
      POSTGRES_PASSWORD: covenant_dev
      POSTGRES_DB: covenant
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

```bash
# Run app on host
pnpm dev   # Next.js :3000
```

## Environment Variables

```bash
# Required
DATABASE_URL=postgresql://covenant:covenant_dev@localhost:5432/covenant
DIRECT_URL=postgresql://covenant:covenant_dev@localhost:5432/covenant
NEXT_PUBLIC_APP_URL=http://localhost:3000
JWT_SECRET=your-secret-key
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
CRON_SECRET=...

# Optional (enable distributed caching + rate limiting)
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...

# Optional (enable transactional email)
BREVO_API_KEY=...
FROM_EMAIL=noreply@arq.app
```

App fails fast at startup if required vars are missing (Zod validation in `src/server/config.ts`).

## Scaling Path

### Phase 1: MVP (0–1000 users)
- Single Hetzner CX22 VPS (4GB RAM, €4.35/month)
- PostgreSQL + Next.js on same machine
- Upstash free tier for Redis
- **~€5/month**

### Phase 2: Growth (1000–10000 users)
- Upgrade to CX32 (8GB) or CX42 (16GB)
- Move PostgreSQL to managed (Neon or Railway)
- Add Upstash paid tier for more throughput
- **~€15–30/month**

### Phase 3: Scale (10000+ users)
- Separate database server
- Load balancer (Hetzner LB: €5.39/month)
- Multiple Next.js replicas
- **~€50–100/month**

## Build & CI

```bash
pnpm lint          # ESLint
pnpm type-check    # tsc --noEmit
pnpm test          # Vitest (server + shared)
pnpm build         # Next.js production build
pnpm dry-run       # Full CI: install + lint + type-check + build + test
```

Git hooks (Husky): lint-staged on commit.

## Monitoring

- **Sentry**: error tracking + source map tunneling (`/monitoring`)
- **Pino**: structured JSON logs in prod (stdout, collect with any log aggregator)
- **Health check**: `GET /api/health`

## What We Are NOT Doing

- No separate Astro landing site — Next.js handles SSG
- No Supabase — fully replaced
- No Kubernetes from day one
- No serverless functions (Lambda, Vercel Edge Functions for core logic)
- No multi-region from day one
- No microservices
