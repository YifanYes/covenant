# Logging

Covenant uses [Pino](https://github.com/pinojs/pino) for structured server-side logging and a thin client-side wrapper that forwards logs to the same Pino stream via a dedicated API endpoint.

---

## Server-Side Logging

**Location:** `src/server/lib/logger.ts`

The logger is a Pino instance configured via environment variables:

| Variable    | Default (dev) | Default (prod) | Description                                |
| ----------- | ------------- | -------------- | ------------------------------------------ |
| `LOG_LEVEL` | `debug`       | `info`         | One of `fatal error warn info debug trace` |
| `NODE_ENV`  | —             | —              | `production` disables pretty-print         |

In development, output is pretty-printed with colorized level labels and `HH:mm:ss.ms` timestamps. In production, output is newline-delimited JSON suitable for log aggregators (Datadog, Loki, etc.).

### Usage

```ts
import { logger } from '@/server/lib/logger'

// Plain message
logger.info('Server started')

// Structured fields first, message last (Pino convention)
logger.info({ userId, requestId }, 'User authenticated')
logger.warn({ host: url.hostname }, 'External service degraded')
logger.error({ err, orderId }, 'Payment processing failed')
```

### Context via child loggers

The tRPC context (`src/server/context.ts`) creates a child logger scoped to the current user:

```ts
const log = user ? logger.child({ userId: user.id }) : logger
```

All log calls inside a request handler should use `ctx.log` rather than the root `logger` so that `userId` is automatically attached.

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
| Server (script) | `import { logger } from '../lib/logger'`             | `logger.error({ ... }, 'message')` |
| Client          | `import { clientLogger } from '@/lib/logger.client'` | `clientLogger.error('msg', ctx)`   |
| Server (script) | `import { logger } from '../lib/logger'`             | `logger.error({ ... }, 'message')` |
| Client          | `import { clientLogger } from '@/lib/logger.client'` | `clientLogger.error('msg', ctx)`   |

Never use `console.*` directly — use the appropriate logger so all output is structured, filterable, and routed consistently.
