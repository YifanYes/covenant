# Structured Logging System

> **Version**: 3.0
> **Status**: Implemented
> **Last Updated**: 2026-05-18

## Summary

Production logging splits along two distinct rails:

- **Operational / structured logs** (server stdout, Railway) — [Pino](https://github.com/pinojs/pino) JSON, request-scoped with `userId`.
- **Production errors** (client + server) — [Sentry](https://sentry.io) SDK, posted directly from the browser/server to Sentry ingest (or the `/monitoring` tunnel route configured by `withSentryConfig`).

Client errors do **not** round-trip through our API. The legacy `/api/logs` endpoint was retired once Sentry was wired up — see `docs/guides/error_monitoring.md`.

Future product analytics (button clicks, funnel events) will live in PostHog, not in either of the rails above — see `docs/specs/posthog_integration.md`.

## Goals

1. Structured JSON output in production (Railway-compatible)
2. Pretty-printed colored output in development
3. Request-scoped logging with user context (`userId`) in authenticated tRPC requests
4. Configurable log levels via `LOG_LEVEL` environment variable
5. Production errors centralized in Sentry without a custom forwarding endpoint

---

## Architecture

### Server Logger (`src/server/lib/logger.ts`)

Standalone Pino instance shared across the application:

```typescript
import pino from 'pino'

const validLevels = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'] as const
const envLevel = process.env.LOG_LEVEL
const nodeEnv = process.env.NODE_ENV as string
const level =
  envLevel && validLevels.includes(envLevel as (typeof validLevels)[number])
    ? envLevel
    : nodeEnv === 'production' ? 'info' : 'debug'

export const logger = pino({
  level,
  ...(nodeEnv !== 'production'
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:HH:mm:ss.l', ignore: 'pid,hostname' }
        }
      }
    : {})
})
```

Key decisions:

- Reads `process.env` directly (not from `config.ts`) to avoid circular dependency
- Dev: uses `pino-pretty` transport for human-readable output
- Prod: raw JSON (no transport overhead, one JSON object per line)

### tRPC Context

The tRPC context creates a child logger scoped to the current user:

```typescript
const log = user ? logger.child({ userId: user.id }) : logger
```

All log calls inside a request handler should use `ctx.log` rather than the root `logger` so that `userId` is automatically attached.

### Log Levels

| Level   | Usage                                                       |
| ------- | ----------------------------------------------------------- |
| `fatal` | Process-ending errors (invalid env, startup failure)        |
| `error` | Operational errors (auth failures, tRPC handler errors)     |
| `warn`  | Warnings (missing optional config)                          |
| `info`  | Key events (server start, cron execution)                   |
| `debug` | Detailed debugging (available in dev by default)            |

Default levels:

- Production (`NODE_ENV=production`): `info`
- Development/Test: `debug`
- Override: Set `LOG_LEVEL` environment variable

### Environment Variables

| Variable    | Default (dev) | Default (prod) | Description                                |
| ----------- | ------------- | -------------- | ------------------------------------------ |
| `LOG_LEVEL` | `debug`       | `info`         | One of `fatal error warn info debug trace` |
| `NODE_ENV`  | —             | —              | `production` disables pretty-print         |

---

## Client-Side Error Reporting

There is **no** custom client logger. Client errors are reported directly to Sentry:

- **Unhandled errors** (render crashes, uncaught promises) — captured automatically by Sentry's global handlers configured in `instrumentation-client.ts` and the React `ErrorBoundary` mounted in `src/components/common/sentry-provider.component.tsx`.
- **Caught errors** (try/catch, mutation `onError`) — call `Sentry.captureException` explicitly so the error stays visible after you swallow it.

### Usage

```ts
import * as Sentry from '@sentry/nextjs'

try {
  await mutate()
} catch (error) {
  Sentry.captureException(error, { tags: { flow: 'create-objective' } })
  toast.error('Something went wrong')
}
```

Use the `tags` field for a stable identifier of the user-facing flow (`google-login`, `create-objective`, …) so issues can be grouped in Sentry without scraping stack traces.

### Why not pino for client?

Pino is a Node-first JSON logger; in the browser it relies on a polyfill, cannot capture Edge runtime, and the original `/api/logs` round-trip was an unauthenticated abuse vector with no rate-limit or body-size cap. Sentry already does grouping, deduplication, sampling, source-map resolution, and replay — using two parallel pipelines added cost without value.

For structured client product telemetry (button clicks, funnel events), use PostHog (see `docs/specs/posthog_integration.md`). Errors are not telemetry.

---

## Adding Logs

| Location               | Import                                         | API                                                  |
| ---------------------- | ---------------------------------------------- | ---------------------------------------------------- |
| Server (tRPC)          | Use `ctx.log` from tRPC context                | `ctx.log.info({ ... }, 'message')`                   |
| Server (script / cron) | `import { logger } from '@/server/lib/logger'` | `logger.error({ ... }, 'message')`                   |
| Client (errors only)   | `import * as Sentry from '@sentry/nextjs'`     | `Sentry.captureException(err, { tags: { flow } })`   |

Never use `console.*` directly — server code uses pino, client error code uses Sentry.

---

## Structured Log Examples

### tRPC error

```json
{
  "level": 50,
  "time": 1707753600000,
  "trpcPath": "habits.create",
  "code": "BAD_REQUEST",
  "err": { "message": "Invalid input" },
  "msg": "tRPC handler error"
}
```

### Cron job

```json
{
  "level": 30,
  "time": 1707753600000,
  "context": "cron",
  "job": "deadline-validation",
  "activitiesProcessed": 5,
  "msg": "Deadline validation completed"
}
```

---

## Sentry Pricing & Quotas

Sentry is the single sink for production errors, so its quota dictates how much error volume is "free". Numbers below are sourced from <https://sentry.io/pricing/> and <https://docs.sentry.io/pricing/quotas/> as of 2026-05-18.

| Plan             | Cost          | Errors / mo | Spans (tracing) / mo | Replays / mo | Logs / mo | Attachments / mo | Cron monitors          | Uptime monitors        |
| ---------------- | ------------- | ----------- | -------------------- | ------------ | --------- | ---------------- | ---------------------- | ---------------------- |
| Developer (free) | $0            | 5k          | 5M                   | 50           | 5 GB      | 1 GB             | 1                      | 1                      |
| Team             | $26/mo annual | 50k         | 5M                   | 50           | 5 GB      | 1 GB             | 1 (+$0.78/extra)       | 1 (+$1.00/extra)       |
| Business         | $80/mo annual | 50k         | 5M                   | 50           | 5 GB      | 1 GB             | 1 (+$0.78/extra)       | 1 (+$1.00/extra)       |

**When does it start costing money?**

- **Developer plan:** never — events past quota are **silently dropped** until the next billing cycle. Good for early-stage usage, bad for incident response (an outage that spikes errors past 5k will hide subsequent errors until the month rolls over).
- **Team / Business:** above the included quota Sentry bills per-event (errors ≈ $0.000290 each, plus per-unit rates for replays/spans/logs). Set a spend cap in **Settings → Subscription → On-demand spend** to make the cost ceiling explicit.

**Cost-control levers already configured** (see `sentry.shared.config.ts`, `instrumentation-client.ts`, `src/app/api/trpc/[...trpc]/route.ts`):

- `tracesSampleRate: 0.1` in prod — drops 90% of performance spans before ingest.
- `replaysSessionSampleRate: 0` — no idle session replays.
- `replaysOnErrorSampleRate: 0.1` — only 10% of error sessions record a replay.
- tRPC `onError` filters out `BAD_REQUEST` / `UNAUTHORIZED` / `TOO_MANY_REQUESTS` — protocol-level noise never reaches Sentry.

**Levers to pull if we ever exceed the free 5k errors/mo:**

- Lower `tracesSampleRate` to `0.05`.
- Drop `replaysOnErrorSampleRate` to `0`.
- Add a `beforeSend` filter to drop known-noisy errors (third-party scripts, network aborts).
- Upgrade to the Team plan ($26/mo) for 10× the error quota.

---

## Files Modified

| File                                                   | Change                                                  |
| ------------------------------------------------------ | ------------------------------------------------------- |
| `src/server/lib/logger.ts`                             | Standalone Pino instance                                |
| `src/server/context.ts`                                | Adds request-scoped `log` to tRPC context               |
| `instrumentation-client.ts`                            | Sentry browser SDK init (replaces `logger.client`)      |
| `sentry.shared.config.ts` / `sentry.server.config.ts`  | Sentry Node/Edge SDK init                               |
| `src/app/api/trpc/[...trpc]/route.ts`                  | tRPC `onError` forwards `INTERNAL_SERVER_ERROR` to Sentry |
| `package.json`                                         | `pino` (prod), `pino-pretty` (dev), `@sentry/nextjs`    |
| `.env.example`                                         | `LOG_LEVEL=debug`                                       |

---

## Future Phases

### Phase 2: Service-layer logging

- Pass `ctx.log` into services for request-correlated business logic logs
- Add structured context per domain (e.g., `{ service: 'combat', missionId }`)

### Phase 3: Performance & audit

- Request duration tracking
- Slow query logging (Prisma middleware)
- Audit log for sensitive operations

### Phase 4: External integrations

- Log aggregation (Datadog, Grafana Cloud) — server pino stream is the source
- Error tracking (Sentry — implemented, see `docs/guides/error_monitoring.md`)
- Alerting on error rate thresholds (Sentry alert rules)
- Optional: `Sentry.pinoIntegration()` to forward server pino warn/error logs into Sentry — deferred until we have a concrete need (5 GB/mo log quota burns fast on the free plan)
