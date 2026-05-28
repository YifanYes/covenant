'use client'

import { useSession } from '@/lib/auth.lib'
import { initBrowserPostHog, posthog } from '@/lib/posthog/client'
import { useEffect, useRef } from 'react'

const STORAGE_KEY = 'covenant.cookie_consent'

function readConsent(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const identifiedRef = useRef<string | null>(null)
  const initializedRef = useRef(false)

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true
    initBrowserPostHog()

    const applyConsent = () => {
      if (readConsent()) {
        posthog.opt_in_capturing()
      }
    }
    applyConsent()

    window.addEventListener('covenant.cookie_consent.changed', applyConsent)
    return () => {
      window.removeEventListener('covenant.cookie_consent.changed', applyConsent)
    }
  }, [])

  useEffect(() => {
    const userId = session?.user?.id ?? null
    if (userId && identifiedRef.current !== userId) {
      // No traits — server already $set durable person properties on signup/character
      // creation. Identify here purely to link the anonymous browser session to userId.
      posthog.identify(userId)
      identifiedRef.current = userId
    } else if (!userId && identifiedRef.current) {
      posthog.reset()
      identifiedRef.current = null
    }
  }, [session?.user?.id])

  return <>{children}</>
}
