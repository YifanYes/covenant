# Structured Logging System

> **Version**: 1.0
> **Status**: Draft
> **Last Updated**: 2026-02-12

## Summary

Replace all ad-hoc `console.log/error/warn` calls with structured JSON logging using Pino, Fastify's native logger. Enables production debugging, request correlation, and future observability integrations.

## Goals

1. Structured JSON output in production (Railway-compatible)
2. Pretty-printed colored output in development
3. Request-scoped logging with automatic `reqId` correlation
4. User context (`userId`) in authenticated tRPC requests
5. Configurable log levels via `LOG_LEVEL` environment variable
6. Zero new production dependencies (Pino is bundled with Fastify)

## Architecture

### Logger Module (`server/lib/logger.ts`)

Standalone Pino instance shared across the application:

```typescript
import pino from 'pino'

const level = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'prod' ? 'info' : 'debug')

export const logger = pino({
  level,
  ...(process.env.NODE_ENV !== 'prod'
    ? { transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss.l', ignore: 'pid,hostname' } } }
    : {})
})
```

Key decisions:
- Reads `process.env` directly (not from `config.ts`) to avoid circular dependency
- Dev: uses `pino-pretty` transport for human-readable output
- Prod: raw JSON (no transport overhead, one JSON object per line)

### Fastify Integration

Pass the shared instance to Fastify:

```typescript
const server = fastify({
  loggerInstance: logger,
  // ...other options
})
```

This gives automatic request/response logging with `reqId` for free.

### tRPC Context

Add `log` to the tRPC context for request-scoped logging:

```typescript
return {
  user,
  prisma,
  services,
  log: user ? req.log.child({ userId: user.id }) : req.log
}
```

Services can use `ctx.log` for request-correlated logging.

### Log Levels

| Level | Usage |
|-------|-------|
| `fatal` | Process-ending errors (invalid env, startup failure) |
| `error` | Operational errors (auth failures, tRPC handler errors) |
| `warn` | Warnings (missing optional config) |
| `info` | Key events (server start, cron execution, request/response) |
| `debug` | Detailed debugging (available in dev by default) |

Default levels:
- Production (`NODE_ENV=prod`): `info`
- Development/Test: `debug`
- Override: Set `LOG_LEVEL` environment variable

## Files Modified

| File | Change |
|------|--------|
| `server/lib/logger.ts` | New: standalone Pino instance |
| `server/package.json` | Add `pino` (prod), `pino-pretty` (dev) |
| `server/config.ts` | Add `LOG_LEVEL` to schema, replace `console.error` |
| `server/server.ts` | `loggerInstance` config, replace all console calls |
| `server/context.ts` | Add request-scoped `log` to tRPC context |
| `server/services/deadline.service.ts` | Replace `console.log` with structured logger |
| `server/prisma.config.ts` | Replace `console.warn` with `logger.warn` |
| `server/.env.example` | Add `LOG_LEVEL=debug` |

## Structured Log Examples

### Request log (automatic via Fastify)
```json
{"level":30,"time":1707753600000,"reqId":"req-1","req":{"method":"GET","url":"/health"},"msg":"incoming request"}
```

### tRPC error
```json
{"level":50,"time":1707753600000,"trpcPath":"habits.create","code":"BAD_REQUEST","err":{"message":"Invalid input"},"msg":"tRPC handler error"}
```

### Cron job
```json
{"level":30,"time":1707753600000,"context":"cron","job":"deadline-validation","activitiesProcessed":5,"msg":"Deadline validation completed"}
```

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
- Error tracking (Sentry integration)
- Alerting on error rate thresholds
