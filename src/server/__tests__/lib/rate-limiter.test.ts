import { beforeEach, describe, expect, it } from 'vitest'
import { checkRateLimit, RateLimiter } from '../../lib/rate-limiter'

describe('RateLimiter', () => {
  let limiter: RateLimiter

  beforeEach(() => {
    limiter = new RateLimiter()
  })

  it('allows requests under the limit', () => {
    const config = { windowMs: 10_000, maxRequests: 3 }
    expect(limiter.isAllowed('key', config)).toBe(true)
    expect(limiter.isAllowed('key', config)).toBe(true)
    expect(limiter.isAllowed('key', config)).toBe(true)
  })

  it('blocks requests at the limit', () => {
    const config = { windowMs: 10_000, maxRequests: 2 }
    limiter.isAllowed('key', config)
    limiter.isAllowed('key', config)
    expect(limiter.isAllowed('key', config)).toBe(false)
  })

  it('tracks different keys independently', () => {
    const config = { windowMs: 10_000, maxRequests: 1 }
    limiter.isAllowed('a', config)
    expect(limiter.isAllowed('a', config)).toBe(false)
    expect(limiter.isAllowed('b', config)).toBe(true)
  })

  it('resets the window after it expires', async () => {
    const config = { windowMs: 50, maxRequests: 1 }
    limiter.isAllowed('key', config)
    expect(limiter.isAllowed('key', config)).toBe(false)

    await new Promise((resolve) => setTimeout(resolve, 60))
    expect(limiter.isAllowed('key', config)).toBe(true)
  })

  it('clears all state on reset', () => {
    const config = { windowMs: 10_000, maxRequests: 1 }
    limiter.isAllowed('key', config)
    limiter.reset()
    expect(limiter.isAllowed('key', config)).toBe(true)
  })

  it('evicts oldest key when max keys exceeded', () => {
    // Access the private store via reflection to verify cap behavior
    const config = { windowMs: 10_000, maxRequests: 10 }

    for (let i = 0; i < 10_001; i++) {
      limiter.isAllowed(`key-${i}`, config)
    }

    const store = (limiter as unknown as { store: Map<string, number[]> }).store
    expect(store.size).toBeLessThanOrEqual(10_000)
  })

  it('always blocks when maxRequests is zero', () => {
    const config = { windowMs: 0, maxRequests: 0 }
    expect(limiter.isAllowed('key', config)).toBe(false)

    const store = (limiter as unknown as { store: Map<string, number[]> }).store
    expect(store.has('key')).toBe(false)
  })
})

describe('checkRateLimit', () => {
  it('falls back to in-memory limiter when redis is not configured', async () => {
    const config = { windowMs: 10_000, maxRequests: 1 }
    const key = 'fallback:test'

    const first = await checkRateLimit(key, config)
    expect(first).toBe(true)

    const second = await checkRateLimit(key, config)
    expect(second).toBe(false)
  })
})
