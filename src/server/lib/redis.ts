import { Redis } from '@upstash/redis'
import { logger } from './logger'

// Read process.env directly (rather than the validated `env` from config) so this module
// is safe to import in unit tests that don't load the full env. Validation lives in
// `config.ts` for code paths that actually require the variables.
function createRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    if (process.env.NODE_ENV === 'production') {
      logger.warn(
        'UPSTASH_REDIS_REST_URL/TOKEN not set in production — rate limits and Better Auth secondaryStorage will use in-memory state per replica'
      )
    }
    return null
  }
  return new Redis({ url, token })
}

export const redis = createRedisClient()
