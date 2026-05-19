import type { ErrorEvent, EventHint } from '@sentry/nextjs'
import * as Sentry from '@sentry/nextjs'

const dsn = process.env.SENTRY_DSN
const isProd = process.env.NODE_ENV === 'production'

const SENSITIVE_HEADERS = new Set([
  'cookie',
  'set-cookie',
  'authorization',
  'proxy-authorization',
  'x-forwarded-for',
  'x-real-ip',
  'forwarded'
])

export function scrubPii(event: ErrorEvent, _hint: EventHint): ErrorEvent | null {
  if (event.user) {
    event.user = event.user.id ? { id: event.user.id } : undefined
  }

  if (event.request) {
    if (event.request.cookies) {
      event.request.cookies = undefined
    }
    if (event.request.headers) {
      const filtered: Record<string, string> = {}
      for (const [key, value] of Object.entries(event.request.headers)) {
        if (!SENSITIVE_HEADERS.has(key.toLowerCase())) {
          filtered[key] = value
        }
      }
      event.request.headers = filtered
    }
    if (event.request.data !== undefined) {
      event.request.data = '[Filtered]'
    }
  }

  return event
}

export function initServerSentry() {
  if (!isProd) return

  Sentry.init({
    dsn: dsn || undefined,

    environment: process.env.ENVIRONMENT || process.env.NODE_ENV,

    tracesSampleRate: 0.1,

    enableLogs: true,

    sendDefaultPii: true,

    beforeSend: scrubPii
  })
}
