import { Ratelimit } from '@upstash/ratelimit'
import { redis } from './redis'

export type RateLimitConfig = {
  windowMs: number
  maxRequests: number
}

export class RateLimiter {
  private store = new Map<string, number[]>()
  private readonly maxKeys = 10_000

  isAllowed(key: string, config: RateLimitConfig): boolean {
    if (config.maxRequests <= 0) {
      return false
    }

    const now = Date.now()
    const windowStart = now - config.windowMs
    const timestamps = this.store.get(key) ?? []
    const valid = timestamps.filter((t) => t > windowStart)

    if (valid.length >= config.maxRequests) {
      this.store.set(key, valid)
      return false
    }

    valid.push(now)
    this.store.set(key, valid)

    if (this.store.size > this.maxKeys) {
      const oldestKey = this.store.keys().next().value
      if (oldestKey !== undefined) {
        this.store.delete(oldestKey)
      }
    }

    return true
  }

  reset() {
    this.store.clear()
  }
}

// In-memory fallback used when Upstash credentials are absent (dev/test, or single-replica
// deploys that have not yet provisioned Redis).
export const rateLimiter = new RateLimiter()

const redisLimiterCache = new Map<string, Ratelimit>()

function getRedisLimiter(config: RateLimitConfig): Ratelimit | null {
  if (!redis) return null
  const cacheKey = `${config.maxRequests}:${config.windowMs}`
  let limiter = redisLimiterCache.get(cacheKey)
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(config.maxRequests, `${config.windowMs} ms`),
      analytics: false,
      prefix: 'covenant_rl'
    })
    redisLimiterCache.set(cacheKey, limiter)
  }
  return limiter
}

export async function checkRateLimit(key: string, config: RateLimitConfig): Promise<boolean> {
  const redisLimiter = getRedisLimiter(config)
  if (redisLimiter) {
    const result = await redisLimiter.limit(key)
    return result.success
  }
  return rateLimiter.isAllowed(key, config)
}
