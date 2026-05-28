import * as Sentry from '@sentry/nextjs'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config')
    await import('../posthog.server.config')
    const { shutdownPostHog } = await import('./server/lib/posthog')
    // Flush events on Railway redeploy. Single canonical lifecycle hook location.
    process.on('SIGTERM', async () => {
      await shutdownPostHog()
      process.exit(0)
    })
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config')
  }
}

export const onRequestError = Sentry.captureRequestError
