import * as Sentry from '@sentry/nextjs'

const isProd = process.env.NODE_ENV === 'production'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_ENVIRONMENT || process.env.NODE_ENV,

  sendDefaultPii: isProd,

  // Adjust sample rates in production
  tracesSampleRate: isProd ? 0.1 : 1.0,

  // Session Replay: disabled to avoid privacy issues; 100% of error sessions
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: isProd ? 0.1 : 1.0,

  enableLogs: true,

  integrations: [
    Sentry.replayIntegration()
  ],

  beforeSend(event) {
    // Filter out local/dev noise unless explicitly enabled
    if (
      !process.env.NEXT_PUBLIC_SENTRY_DSN &&
      !isProd
    ) {
      return null
    }
    return event
  }
})

// Hook into App Router navigation transitions
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
