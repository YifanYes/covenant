# Deployment Guide

This guide walks through deploying Covenant to a host such as Railway, Fly.io, or Render. Covenant is a single Next.js monolith, so any platform that supports Next.js 16 + Node.js 22 + PostgreSQL will work.

## Prerequisites

- A PostgreSQL database (managed or self-hosted)
- Node.js 22+ build environment
- pnpm 10.4.1 (enforced via `packageManager`)
- Domain you control (optional, but recommended for production)

## 1. Provision the database

Most providers offer a managed Postgres add-on. Capture the connection string in both pooled and direct forms — Covenant needs both:

- `DATABASE_URL` — pooled connection (used at runtime)
- `DIRECT_URL` — direct connection (used by Prisma migrations)

## 2. Configure environment variables

Set the following on your host's variables dashboard. See `.env.example` for the full list.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` / `DIRECT_URL` | Postgres connection strings |
| `NEXT_PUBLIC_APP_URL` | Public origin, e.g. `https://your-domain.example` |
| `JWT_SECRET` | Random 64-byte secret (`openssl rand -base64 64`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth credentials |
| `BREVO_API_KEY` / `FROM_EMAIL` | Transactional email (see `email_setup.md`) |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Redis for rate limit + lockout (required in prod) |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | Error monitoring (see `error_monitoring.md`) |
| `SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN` | Source-map upload at build time |

## 3. Build command

Mirror the local pre-push check exactly:

```
pnpm install --frozen-lockfile && pnpm prisma generate && pnpm lint && npx tsc --noEmit && pnpm build && pnpm test:run
```

Then run migrations once at first deploy:

```
pnpm db:migrate
```

## 4. Start command

```
pnpm start
```

## 5. Domain setup

Point your domain at the host's generated URL (e.g. `your-app.railway.app`) using a CNAME or ALIAS record. Then add the custom domain in the host's networking panel so TLS is provisioned automatically.

Update OAuth redirect URIs in the Google Cloud Console to point at the new public origin:

```
https://<your-domain>/api/auth/callback/google
```

## Notes

- **AGPL §13 source link.** If you deploy your own fork or instance, the app footer must link to the corresponding running source. See `CONTRIBUTING.md`.
- **Build memory.** The Next.js build can spike to ~2 GB. Provision a build container with at least 4 GB RAM.
- **Health check.** A `GET /api/health` endpoint is exposed for platform readiness checks.
