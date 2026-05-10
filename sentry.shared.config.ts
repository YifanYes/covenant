import * as Sentry from '@sentry/nextjs'

const dsn = process.env.SENTRY_DSN
const isProd = process.env.NODE_ENV === 'production'

export function initServerSentry() {
  if (!isProd) return

  Sentry.init({
    dsn: dsn || undefined,

    environment: process.env.ENVIRONMENT || process.env.NODE_ENV,

    tracesSampleRate: 0.1,

    enableLogs: true,

    sendDefaultPii: true,
  })
}
