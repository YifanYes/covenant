export type RateLimitConfig = {
  windowMs: number
  maxRequests: number
}

export class RateLimiter {
  private store = new Map<string, number[]>()
  private readonly maxKeys = 10_000

  isAllowed(key: string, config: RateLimitConfig): boolean {
    const now = Date.now()
    const windowStart = now - config.windowMs
    const timestamps = this.store.get(key) ?? []
    const valid = timestamps.filter((t) => t > windowStart)

    if (valid.length >= config.maxRequests) {
      if (valid.length > 0) {
        this.store.set(key, valid)
      } else {
        this.store.delete(key)
      }
      return false
    }

    valid.push(now)
    this.store.set(key, valid)

    // Prevent unbounded memory growth by capping total tracked keys
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

export const rateLimiter = new RateLimiter()
