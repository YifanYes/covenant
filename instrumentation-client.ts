import * as Sentry from '@sentry/nextjs'
import { scrubPii } from './sentry.shared.config'

const isProd = process.env.NODE_ENV === 'production'

if (isProd) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NEXT_PUBLIC_ENVIRONMENT || process.env.NODE_ENV,

    sendDefaultPii: true,

    tracesSampleRate: 0.1,

    // Session Replay: disabled to avoid privacy issues; sample errors only
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.1,

    enableLogs: true,

    beforeSend: scrubPii,

    integrations: [Sentry.replayIntegration()]
  })
}

// Hook into App Router navigation transitions
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
