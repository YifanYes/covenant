# Infrastructure Redesign - ARQ

> **Version**: 1.0  
> **Status**: Proposal  
> **Last Updated**: 2026-01-25

## Executive Summary

ARQ is a gamified productivity app with an RPG-style system. The current stack (React SPA + Bun/tRPC backend + Supabase) has a critical limitation: **zero SEO** for the landing page due to client-side rendering.

This document proposes an affordable, scalable infrastructure that solves the SEO problem while maintaining development velocity and keeping costs under control.

## Current Stack Analysis

| Layer          | Current Tech                                    | Issue                              |
| -------------- | ----------------------------------------------- | ---------------------------------- |
| **Frontend**   | React 19, Vite, TailwindCSS v4, Zustand, RQuery | CSR only → No SEO                  |
| **Backend**    | Bun, tRPC, Fastify, Prisma                      | Good, but tied to Supabase         |
| **Database**   | Supabase (PostgreSQL)                           | Expensive at scale, vendor lock-in |
| **Auth**       | Supabase Auth                                   | Coupled to Supabase                |
| **Validation** | Zod                                             | ✅ Keep                            |
| **i18n**       | i18next                                         | ✅ Keep                            |

### When Supabase Makes Sense

Supabase is justified when:

- Prototype that will die in 3 months
- B2B project with <100 enterprise users paying $X00/month each
- You need Realtime + Auth + Storage integrated NOW and have no backend developer

**For ARQ**: We have a backend, we need SEO, and we want to scale affordably. Supabase becomes a liability.

## Proposed Architecture

### Option A: Astro + Current Backend (Recommended)

Keep the existing backend, add Astro for landing/marketing pages with SSG/SSR.

```
┌─────────────────────────────────────────────────────────────┐
│                        User Browser                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Reverse Proxy (Caddy)                     │
│  arq.app → Astro (landing)  |  app.arq.app → React SPA      │
│  api.arq.app → tRPC Backend                                  │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  Astro (SSG)  │    │  React SPA    │    │ tRPC Backend  │
│  Landing Page │    │  App (Vite)   │    │ (Bun/Fastify) │
│  Blog, Docs   │    │  Dashboard    │    │               │
└───────────────┘    └───────────────┘    └───────────────┘
                              │                     │
                              └──────────┬──────────┘
                                         ▼
                              ┌───────────────────┐
                              │    PostgreSQL     │
                              │    (Self-hosted)  │
                              └───────────────────┘
```

**Pros:**

- Minimal changes to existing codebase
- Astro is perfect for static marketing content
- React SPA stays as-is for the app
- Clear separation: marketing vs app

**Cons:**

- Two frontend projects to maintain
- Slightly more complex deployment

### Option B: Next.js Full Migration

Replace React SPA with Next.js for both landing and app.

```
┌─────────────────────────────────────────────────────────────┐
│                        User Browser                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Reverse Proxy (Caddy)                     │
│  arq.app → Next.js  |  api.arq.app → tRPC Backend           │
└─────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                ▼                           ▼
┌───────────────────────────┐    ┌───────────────────────────┐
│        Next.js 15         │    │      tRPC Backend         │
│  - SSG: Landing, Blog     │    │      (Bun/Fastify)        │
│  - SSR: SEO pages         │    │                           │
│  - CSR: App dashboard     │    │                           │
└───────────────────────────┘    └───────────────────────────┘
                │                           │
                └─────────────┬─────────────┘
                              ▼
                   ┌───────────────────┐
                   │    PostgreSQL     │
                   └───────────────────┘
```

**Pros:**

- Single frontend codebase
- Flexible rendering (SSG/SSR/CSR per page)
- tRPC integrates natively with Next.js
- Better DX for full-stack features

**Cons:**

- Significant migration effort
- More RAM needed for SSR
- Vercel lock-in temptation

### Option C: Keep React SPA + Separate Astro Landing (Simplest)

Two completely separate projects. Landing is a static site, app is the current SPA.

**Pros:**

- Zero changes to current app
- Landing can be hosted on Cloudflare Pages for free
- Fastest to implement

**Cons:**

- No shared components/styles
- Two separate deployments
- Auth redirect complexity

## Recommended Path: Option A (Astro Hybrid)

For ARQ's needs, Option A provides the best balance:

1. **SEO solved** with Astro SSG for landing/marketing
2. **Minimal disruption** to existing React app
3. **Clear boundaries** between marketing and product
4. **Cost-effective** - Astro is lightweight

### Migration Steps

1. Create `landing/` folder with Astro project
2. Move landing page content to Astro
3. Configure routing: `arq.app` → Astro, `app.arq.app` → React
4. Migrate from Supabase to self-hosted PostgreSQL
5. Implement own auth (JWT with refresh tokens)

## Supabase Replacement Options

Supabase provides 4 main services. Here are the alternatives for each:

### 1. Database (PostgreSQL)

| Option                     | Description                     | Cost                        | Pros                                   | Cons                        |
| -------------------------- | ------------------------------- | --------------------------- | -------------------------------------- | --------------------------- |
| **Self-hosted PostgreSQL** | Run PostgreSQL in Docker on VPS | €0 (included in VPS)        | Full control, cheapest, no limits      | You manage backups, updates |
| **Neon**                   | Serverless PostgreSQL           | Free: 0.5GB, then $19/month | Auto-scaling, branching, generous free | Cold starts, vendor lock-in |
| **Railway PostgreSQL**     | Managed PostgreSQL plugin       | ~$7/month                   | Easy setup, good DX                    | Limited configuration       |
| **PlanetScale**            | MySQL-compatible serverless     | Free tier available         | Branching, great DX                    | MySQL not PostgreSQL        |
| **Turso**                  | SQLite at the edge (libSQL)     | Free: 9GB                   | Edge-native, fast reads                | Different paradigm          |
| **Supabase (DB only)**     | Keep just the database          | $25/month                   | No migration needed                    | Still expensive             |

**Recommendation**: Self-hosted PostgreSQL for cost, Neon if you want managed.

### 2. Authentication

| Option              | Description                  | Cost                          | Pros                            | Cons                        |
| ------------------- | ---------------------------- | ----------------------------- | ------------------------------- | --------------------------- |
| **Self-hosted JWT** | Implement your own auth      | €0                            | Full control, no dependencies   | More code to write/maintain |
| **Lucia Auth**      | Auth library (not a service) | €0                            | Lightweight, framework-agnostic | You host it                 |
| **Better Auth**     | Modern auth library          | €0                            | TypeScript-first, many adapters | Newer, less battle-tested   |
| **Clerk**           | Auth-as-a-service            | Free: 10k MAU, then $25/month | Great DX, many features         | Expensive at scale          |
| **Auth0**           | Enterprise auth service      | Free: 7.5k MAU                | Feature-rich, enterprise-ready  | Complex, expensive          |
| **Kinde**           | Modern auth service          | Free: 10.5k MAU               | Good DX, generous free tier     | Newer service               |
| **WorkOS**          | Enterprise SSO focus         | Free: 1M MAU                  | Great for B2B                   | Overkill for B2C            |

**Recommendation**: Self-hosted JWT with `arctic` for OAuth, or Better Auth for faster implementation.

### 3. Storage (File Uploads)

| Option                  | Description                  | Cost                  | Pros                            | Cons                 |
| ----------------------- | ---------------------------- | --------------------- | ------------------------------- | -------------------- |
| **MinIO (self-hosted)** | S3-compatible object storage | €0 (included in VPS)  | S3 API compatible, full control | You manage it        |
| **Cloudflare R2**       | S3-compatible storage        | Free: 10GB, no egress | No egress costs, global CDN     | Cloudflare ecosystem |
| **Backblaze B2**        | Cheap object storage         | $0.005/GB/month       | Very cheap, S3 compatible       | Less features        |
| **AWS S3**              | Industry standard            | ~$0.023/GB/month      | Reliable, feature-rich          | Egress costs add up  |
| **UploadThing**         | File uploads for React       | Free: 2GB             | Great DX, easy setup            | Limited free tier    |

**Recommendation**: Cloudflare R2 (free egress) or MinIO self-hosted.

### 4. Realtime (WebSockets)

| Option                         | Description                      | Cost                    | Pros                     | Cons              |
| ------------------------------ | -------------------------------- | ----------------------- | ------------------------ | ----------------- |
| **Self-hosted (Socket.io/ws)** | WebSocket server in your backend | €0                      | Full control, integrated | You scale it      |
| **Ably**                       | Realtime messaging service       | Free: 6M messages/month | Reliable, many SDKs      | Can get expensive |
| **Pusher**                     | Realtime channels                | Free: 200k messages/day | Easy to use              | Limited free tier |
| **PartyKit**                   | Edge-native realtime             | Free tier available     | Modern, Cloudflare-based | Newer             |
| **Soketi**                     | Open-source Pusher replacement   | €0 (self-hosted)        | Pusher-compatible API    | You host it       |

**Recommendation**: Self-hosted WebSockets (you already have Fastify), or Ably for managed.

### Complete Supabase Replacement Stacks

**Budget Option (€5-10/month total):**

```
Database:     Self-hosted PostgreSQL (Docker)
Auth:         Self-hosted JWT + arctic (OAuth)
Storage:      Cloudflare R2 (free) or MinIO
Realtime:     Self-hosted WebSockets (Fastify)
Hosting:      Hetzner VPS CX22 (€4.35/month)
```

**Managed Option ($20-40/month total):**

```
Database:     Neon ($0-19/month)
Auth:         Clerk or Kinde (free tier)
Storage:      Cloudflare R2 (free)
Realtime:     Ably (free tier)
Hosting:      Railway or Fly.io ($10-20/month)
```

**Hybrid Option ($10-20/month total):**

```
Database:     Railway PostgreSQL ($7/month)
Auth:         Better Auth (self-hosted, €0)
Storage:      Cloudflare R2 (free)
Realtime:     Self-hosted WebSockets
Hosting:      Railway ($5-10/month)
```

### Migration Complexity by Service

| Service  | Migration Effort | Notes                                           |
| -------- | ---------------- | ----------------------------------------------- |
| Database | Low              | pg_dump/pg_restore, update connection string    |
| Auth     | Medium           | Need to implement login/register, migrate users |
| Storage  | Low              | Change SDK calls, migrate files                 |
| Realtime | Low-Medium       | If using, replace with Socket.io                |

### Recommended Migration Order

1. **Database first** - Easiest, just change connection string
2. **Storage second** - Simple SDK swap
3. **Auth third** - Most complex, do carefully
4. **Realtime last** - Only if you're using it

## Local Development Setup

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine
    ports:
      - '5432:5432'
    environment:
      POSTGRES_USER: arq
      POSTGRES_PASSWORD: arq_dev
      POSTGRES_DB: arq
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'

volumes:
  postgres_data:
```

```bash
# Running on host (not in Docker for faster dev):
├── landing/    - bun dev (Astro :4321)
├── front/      - bun dev (Vite :3000)
└── server/     - bun dev (tRPC :4000)
```

### Environment Variables

```bash
# server/.env
DATABASE_URL=postgresql://arq:arq_dev@localhost:5432/arq
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret

# front/.env
VITE_API_URL=http://localhost:4000
VITE_APP_URL=http://localhost:3000

# landing/.env (Astro)
PUBLIC_APP_URL=http://localhost:3000
PUBLIC_API_URL=http://localhost:4000
```

## Deployment Options

### Option 1: Hetzner Self-Hosted (Recommended for Cost)

```yaml
# docker-compose.production.yml
services:
  postgres:
    image: postgres:16-alpine
    deploy:
      resources:
        limits:
          memory: 1.5G
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    deploy:
      resources:
        limits:
          memory: 256M

  backend:
    build: ./server
    deploy:
      resources:
        limits:
          memory: 1G
    environment:
      - DATABASE_URL=postgresql://postgres:5432/arq
      - REDIS_URL=redis://redis:6379

  frontend:
    build: ./front
    deploy:
      resources:
        limits:
          memory: 512M

  landing:
    build: ./landing
    deploy:
      resources:
        limits:
          memory: 256M

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
arq.app {
    reverse_proxy landing:4321
}

app.arq.app {
    reverse_proxy frontend:3000
}

api.arq.app {
    reverse_proxy backend:4000
}
```

**Hetzner CX22 (4GB RAM): €4.35/month**

- Sufficient for MVP and early growth
- Upgrade to CX32 (8GB) when needed: €7.59/month

**Total: ~€5-8/month**

### Option 2: Railway (Managed Simplicity)

```
Railway Project:
├── Service: backend
│   ├── Dockerfile build
│   └── PORT: 4000
├── Service: frontend
│   ├── Dockerfile build
│   └── PORT: 3000
├── Service: landing
│   ├── Dockerfile build
│   └── PORT: 4321
├── Plugin: PostgreSQL (~$7/month)
└── Plugin: Redis (~$3/month)

Total: ~$15-25/month
```

### Option 3: Hybrid (Best of Both)

```
Cloudflare Pages (Free):
└── Landing (Astro static build)

Railway ($10-15/month):
├── Backend (tRPC)
├── Frontend (React SPA)
└── PostgreSQL

Total: ~$10-15/month
```

### Option 4: Fly.io (Free Tier Friendly)

```
fly.toml (backend):
- app: arq-api
- 1x shared-cpu, 512MB
- Postgres attached (free 1GB)

fly.toml (frontend):
- app: arq-app
- 1x shared-cpu, 256MB

fly.toml (landing):
- app: arq-landing
- 1x shared-cpu, 256MB

Total: $0 while in free tier, ~$10-15/month after
```

## Cost Comparison

| Setup             | Monthly Cost | Pros                      | Cons                 |
| ----------------- | ------------ | ------------------------- | -------------------- |
| Hetzner VPS       | €5-8         | Full control, cheapest    | Self-managed         |
| Railway           | $15-25       | Easy, managed             | More expensive       |
| Fly.io            | $0-15        | Free tier, global edge    | Complex networking   |
| Hybrid (CF+Rail)  | $10-15       | Free landing, managed app | Split infrastructure |
| Vercel + Supabase | $25-50+      | Zero config               | Expensive at scale   |

**Recommendation**: Start with **Hetzner** for maximum cost control, or **Hybrid** if you want managed services.

## Auth Migration (Supabase → Self-Hosted)

### Current: Supabase Auth

- Magic links, OAuth providers
- Session management handled by Supabase
- Tied to Supabase project

### Proposed: JWT-based Auth

```typescript
// server/services/auth/auth.service.ts
export class AuthService {
  async login(email: string, password: string): Promise<AuthTokens> {
    const user = await this.userRepository.findByEmail(email)
    if (!user || !(await this.verifyPassword(password, user.passwordHash))) {
      throw new AuthError('INVALID_CREDENTIALS')
    }

    return this.generateTokens(user)
  }

  generateTokens(user: User): AuthTokens {
    const accessToken = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '15m' })

    const refreshToken = jwt.sign({ userId: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' })

    return { accessToken, refreshToken }
  }

  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET)
    const user = await this.userRepository.findById(payload.userId)
    return this.generateTokens(user)
  }
}
```

### OAuth (Optional)

Use `arctic` library for OAuth providers (Google, GitHub, etc.) without Supabase dependency.

## Database Migration

### From Supabase to Self-Hosted PostgreSQL

1. **Update Prisma connection**:

   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

2. **Remove Supabase dependencies**:
   ```bash
   bun remove @supabase/supabase-js
   ```

## Scaling Strategy

### Phase 1: MVP (0-1000 users)

- Single Hetzner VPS (CX22, 4GB)
- All services on one machine
- Daily backups to Backblaze B2
- **Cost: ~€5/month**

### Phase 2: Growth (1000-10000 users)

- Upgrade to CX32 (8GB) or CX42 (16GB)
- Add Redis for caching/sessions
- Consider CDN for static assets
- **Cost: ~€15-30/month**

### Phase 3: Scale (10000+ users)

- Separate database server
- Multiple app server replicas
- Load balancer (Hetzner LB: €5.39/month)
- Managed PostgreSQL if needed
- **Cost: ~€50-100/month**

### Phase 4: Enterprise (100000+ users)

- Kubernetes cluster or managed services
- Multi-region deployment
- Dedicated DevOps
- **Cost: Variable, but you have revenue**

## Implementation Roadmap

### Week 1-2: Foundation

- [ ] Set up Docker Compose for local development
- [ ] Create Astro landing project
- [ ] Configure Caddy reverse proxy locally

### Week 3-4: Auth Migration

- [ ] Implement JWT auth service
- [ ] Create login/register flows
- [ ] Migrate existing users (if any)
- [ ] Remove Supabase Auth dependency

### Week 5-6: Database Migration

- [ ] Set up self-hosted PostgreSQL
- [ ] Export/import data from Supabase
- [ ] Update Prisma configuration
- [ ] Remove Supabase client dependency

### Week 7-8: Deployment

- [ ] Set up Hetzner VPS
- [ ] Configure production Docker Compose
- [ ] Set up SSL with Caddy
- [ ] Configure backups to B2
- [ ] DNS configuration

### Week 9-10: Polish

- [ ] Monitoring setup (Uptime Kuma)
- [ ] Log aggregation (Loki or simple file logs)
- [ ] Performance testing
- [ ] Documentation

## Summary

| Aspect         | Current             | Proposed                         |
| -------------- | ------------------- | -------------------------------- |
| SEO            | ❌ None (CSR)       | ✅ Astro SSG for landing         |
| Auth           | Supabase Auth       | Self-hosted JWT + arctic (OAuth) |
| Database       | Supabase PostgreSQL | Self-hosted PostgreSQL           |
| Storage        | Supabase Storage    | Cloudflare R2                    |
| Realtime       | Supabase Realtime   | Self-hosted WebSockets (Fastify) |
| Frontend App   | React SPA (Vite)    | React SPA (unchanged)            |
| Landing        | Part of React SPA   | Separate Astro project           |
| Backend        | Bun + tRPC          | Bun + tRPC (unchanged)           |
| Hosting        | N/A                 | Hetzner VPS CX22                 |
| Monthly Cost   | ~$25+ (Supabase)    | ~€5-10 (self-hosted)             |
| Vendor Lock-in | High (Supabase)     | None                             |
| Scalability    | Limited by Supabase | Unlimited (self-managed)         |

### Recommended Stack (€5-10/month)

```
Database:     Self-hosted PostgreSQL (Docker)
Auth:         Self-hosted JWT + arctic (OAuth)
Storage:      Cloudflare R2 (free)
Realtime:     Self-hosted WebSockets (Fastify)
Hosting:      Hetzner VPS CX22 (€4.35/month)
```

## What We Are NOT Doing

- ❌ Migrating to a monolith (Next.js handles everything)
- ❌ Using serverless functions (Lambda, Vercel Functions)
- ❌ Kubernetes from day one
- ❌ Multi-region from day one
- ❌ Microservices architecture

We keep the architecture **simple, affordable, and scalable** when needed.
