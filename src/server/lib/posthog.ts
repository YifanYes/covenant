import { PostHog } from 'posthog-node'
import { logger } from './logger'

let client: PostHog | null = null
const isProd = process.env.NODE_ENV === 'production'

export function initServerPostHog(): void {
  // Force creation on import so the singleton is ready before the first request.
  getPostHog()
}

export function getPostHog(): PostHog | null {
  if (!isProd) return null
  // Read process.env directly rather than importing `env` — keeps tests that import
  // analytics from a service from triggering the full env-validation chain.
  const key = process.env.POSTHOG_KEY
  if (!key) return null
  if (!client) {
    client = new PostHog(key, {
      host: process.env.POSTHOG_HOST ?? 'https://eu.i.posthog.com',
      flushAt: 20,
      flushInterval: 10_000,
      // Server captures run under legitimate interest with no PII beyond userId.
      // Disabling geoip stops PostHog from inferring location from server IPs (which
      // are infra IPs, not user IPs — would be noise anyway).
      disableGeoip: true
    })
  }
  return client
}

export async function shutdownPostHog(): Promise<void> {
  if (client) {
    try {
      await client.shutdown()
    } catch (err) {
      logger.warn({ err }, 'PostHog shutdown failed')
    }
  }
}
