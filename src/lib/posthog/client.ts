import posthog from 'posthog-js'

const isProd = process.env.NODE_ENV === 'production'

export function initBrowserPostHog(): void {
  if (!isProd) return
  if (typeof window === 'undefined') return
  if ((posthog as unknown as { __loaded?: boolean }).__loaded) return
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return

  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com',
    ui_host: 'https://eu.posthog.com',
    // Config snapshot — flips `capture_pageview` to `'history_change'`, which
    // auto-captures App Router transitions via the history API. No manual
    // pathname/searchParams listener (and no Suspense boundary footgun).
    defaults: '2026-01-30',
    persistence: 'localStorage+cookie',
    opt_out_capturing_by_default: true,
    disable_session_recording: true,
    autocapture: true
  })
}

export { posthog }
