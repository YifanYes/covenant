import { cache } from 'react'
import { logger } from './logger'
import { getPostHog } from './posthog'

type FlagsSnapshot = Awaited<ReturnType<NonNullable<ReturnType<typeof getPostHog>>['evaluateFlags']>>

export const getFlagsSnapshot = cache(async (userId: string): Promise<FlagsSnapshot | null> => {
  const ph = getPostHog()
  if (!ph) return null
  try {
    return await ph.evaluateFlags(userId)
  } catch (err) {
    logger.warn({ err, userId }, 'PostHog flag eval failed')
    return null
  }
})

export async function isFeatureEnabled(userId: string, key: string, fallback = false): Promise<boolean> {
  const flags = await getFlagsSnapshot(userId)
  return flags?.isEnabled(key) ?? fallback
}

export async function getFeatureFlagPayload<T>(userId: string, key: string): Promise<T | null> {
  const flags = await getFlagsSnapshot(userId)
  return (flags?.getFlagPayload(key) as T | undefined) ?? null
}
