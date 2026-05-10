# Structured Logging System

> **Version**: 2.0
> **Status**: Implemented
> **Last Updated**: 2026-05-08

## Summary

All server-side logging uses [Pino](https://github.com/pinojs/pino) for structured JSON output. A thin client-side wrapper forwards browser logs to the same Pino stream via `/api/logs`. This replaces every ad-hoc `console.log/error/warn` call and provides a single, filterable, aggregator-friendly log pipeline.

## Goals

1. Structured JSON output in production (Railway-compatible)
2. Pretty-printed colored output in development
3. Request-scoped logging with user context (`userId`) in authenticated tRPC requests
4. Configurable log levels via `LOG_LEVEL` environment variable
5. Client logs unified into the same stream as server logs

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

## Client-Side Logging

**Location:** `src/lib/logger.client.ts`

A lightweight wrapper that:

- In **development**: calls `console[level]` for immediate browser devtools feedback
- In **all environments**: ships a fire-and-forget POST to `/api/logs` (never throws, never blocks)

### Usage

```ts
import { clientLogger } from '@/lib/logger.client'

// Plain message
clientLogger.info('Sidebar opened')

// With context (Error objects, extra data)
clientLogger.error('Failed to create objective', error)
clientLogger.warn('Stale cache detected', { cacheAge })
```

### Payload shape

```ts
{
  level: 'error' | 'warn' | 'info'
  message: string          // max 1000 chars
  context?: unknown        // serialised as-is
  timestamp: string        // ISO 8601
  source: 'client'
}
```

The schema is defined in `src/shared/schemas/logs.schemas.ts` and validated by both the client logger (TypeScript types) and the API endpoint (Zod at runtime).

---

## `/api/logs` Endpoint

**Location:** `src/app/api/logs/route.ts`

| Method | Path        | Auth | Purpose                             |
| ------ | ----------- | ---- | ----------------------------------- |
| POST   | `/api/logs` | None | Receive client log, forward to Pino |

The endpoint validates the payload with `clientLogSchema`, then calls:

```ts
logger[level]({ source: 'client', timestamp, context }, message)
```

This means client logs appear in the same Pino stream as server logs, tagged with `"source":"client"`, and can be filtered or routed separately in any log aggregator.

**Error responses:**

- `400 { error: 'Invalid payload' }` — Zod validation failed
- `400 { error: 'Bad request' }` — malformed JSON body

---

## Adding Logs

| Location        | Import                                               | API                                |
| --------------- | ---------------------------------------------------- | ---------------------------------- |
| Server (tRPC)   | Use `ctx.log` from tRPC context                      | `ctx.log.info({ ... }, 'message')` |
| Server (script) | `import { logger } from '@/server/lib/logger'`       | `logger.error({ ... }, 'message')` |
| Client          | `import { clientLogger } from '@/lib/logger.client'` | `clientLogger.error('msg', ctx)`   |

Never use `console.*` directly — use the appropriate logger so all output is structured, filterable, and routed consistently.

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

## Files Modified

| File                                  | Change                                             |
| ------------------------------------- | -------------------------------------------------- |
| `src/server/lib/logger.ts`            | Standalone Pino instance                           |
| `src/server/context.ts`               | Adds request-scoped `log` to tRPC context          |
| `src/lib/logger.client.ts`            | Client logger wrapper                              |
| `src/app/api/logs/route.ts`           | Receives client logs and forwards to Pino          |
| `src/shared/schemas/logs.schemas.ts`  | Zod schema for client log payloads                 |
| `package.json`                        | `pino` (prod), `pino-pretty` (dev)                 |
| `.env.example`                        | `LOG_LEVEL=debug`                                  |

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

- Log aggregation (Datadog, Grafana Cloud)
- Error tracking (Sentry — see `docs/guides/sentry_setup.md`)
- Alerting on error rate thresholds
