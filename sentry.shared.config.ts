import * as Sentry from '@sentry/nextjs'

const dsn = process.env.SENTRY_DSN
const isProd = process.env.NODE_ENV === 'production'

export function initServerSentry() {
  Sentry.init({
    dsn: dsn || undefined,

    environment: process.env.ENVIRONMENT || process.env.NODE_ENV,

    tracesSampleRate: isProd ? 0.1 : 1.0,

    enableLogs: true,

    sendDefaultPii: isProd,
  })
}
