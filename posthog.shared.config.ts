import { initServerPostHog as initServerPostHogClient } from './src/server/lib/posthog'

export function initServerPostHog(): void {
  initServerPostHogClient()
}
