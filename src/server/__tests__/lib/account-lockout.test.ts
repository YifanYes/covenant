import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the redis module so we can swap between the in-memory fallback (default) and a
// fake Upstash client without touching the real Upstash SDK. The lockout module reads
// the named export `redis`; using a getter makes the binding live so each describe
// block can install its own client at setup time.
const { redisState } = vi.hoisted(() => ({
  redisState: { client: null as unknown }
}))

vi.mock('../../lib/redis', () => ({
  get redis() {
    return redisState.client
  }
}))

import {
  _resetLockoutMemoryStore,
  checkLockout,
  clearLockout,
  FAIL_THRESHOLD,
  LOCK_TTLS_SEC,
  recordFailure
} from '../../lib/account-lockout'

describe('account-lockout (in-memory fallback)', () => {
  beforeEach(() => {
    redisState.client = null
    _resetLockoutMemoryStore()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('reports unlocked when no failures recorded', async () => {
    expect(await checkLockout('user@example.com')).toEqual({ locked: false })
  })

  it('does not lock under the threshold', async () => {
    for (let i = 0; i < FAIL_THRESHOLD - 1; i++) {
      const status = await recordFailure('user@example.com')
      expect(status.locked).toBe(false)
    }
    expect(await checkLockout('user@example.com')).toEqual({ locked: false })
  })

  it('locks at the threshold with the first backoff window', async () => {
    let lastStatus = await recordFailure('user@example.com')
    for (let i = 1; i < FAIL_THRESHOLD; i++) {
      lastStatus = await recordFailure('user@example.com')
    }
    expect(lastStatus.locked).toBe(true)
    if (lastStatus.locked) {
      expect(lastStatus.retryAfterSeconds).toBeLessThanOrEqual(LOCK_TTLS_SEC[0])
      expect(lastStatus.retryAfterSeconds).toBeGreaterThan(0)
    }
    const check = await checkLockout('user@example.com')
    expect(check.locked).toBe(true)
  })

  it('uses exponential backoff for subsequent failures', async () => {
    for (let i = 0; i < FAIL_THRESHOLD; i++) await recordFailure('user@example.com')
    const second = await recordFailure('user@example.com')
    expect(second.locked).toBe(true)
    if (second.locked) {
      // Second tier (fails === FAIL_THRESHOLD + 1) should be longer than the first.
      expect(second.retryAfterSeconds).toBeGreaterThan(LOCK_TTLS_SEC[0] - 1)
      expect(second.retryAfterSeconds).toBeLessThanOrEqual(LOCK_TTLS_SEC[1])
    }
  })

  it('caps backoff at the longest configured window', async () => {
    // Push fails well past the table length to exercise the cap.
    for (let i = 0; i < FAIL_THRESHOLD + LOCK_TTLS_SEC.length + 5; i++) {
      await recordFailure('user@example.com')
    }
    const status = await checkLockout('user@example.com')
    expect(status.locked).toBe(true)
    if (status.locked) {
      const max = LOCK_TTLS_SEC[LOCK_TTLS_SEC.length - 1]
      expect(status.retryAfterSeconds).toBeLessThanOrEqual(max)
    }
  })

  it('clearLockout removes both counter and lock', async () => {
    for (let i = 0; i < FAIL_THRESHOLD; i++) await recordFailure('user@example.com')
    expect((await checkLockout('user@example.com')).locked).toBe(true)
    await clearLockout('user@example.com')
    expect(await checkLockout('user@example.com')).toEqual({ locked: false })
    // After clearing, the counter has been reset — next failure starts the streak fresh.
    const next = await recordFailure('user@example.com')
    expect(next.locked).toBe(false)
  })

  it('tracks emails independently, case-insensitive', async () => {
    for (let i = 0; i < FAIL_THRESHOLD; i++) await recordFailure('Alice@example.com')
    expect((await checkLockout('alice@example.com')).locked).toBe(true)
    expect((await checkLockout('  ALICE@example.com  ')).locked).toBe(true)
    expect((await checkLockout('bob@example.com')).locked).toBe(false)
  })

  it('lock expires after retryAfter elapses', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))

    for (let i = 0; i < FAIL_THRESHOLD; i++) await recordFailure('user@example.com')
    expect((await checkLockout('user@example.com')).locked).toBe(true)

    vi.setSystemTime(new Date(Date.now() + (LOCK_TTLS_SEC[0] + 1) * 1000))
    expect((await checkLockout('user@example.com')).locked).toBe(false)
  })

  it('ignores empty email', async () => {
    expect(await checkLockout('')).toEqual({ locked: false })
    expect(await recordFailure('')).toEqual({ locked: false, failures: 0, transitionedToLocked: false })
    await clearLockout('')
  })

  it('reports transitionedToLocked exactly once on first lock', async () => {
    let transitions = 0
    for (let i = 0; i < FAIL_THRESHOLD + 2; i++) {
      const r = await recordFailure('user@example.com')
      if (r.transitionedToLocked) transitions++
    }
    expect(transitions).toBe(1)
  })
})

// Minimal Upstash-shaped fake. Only the methods the lockout module actually invokes
// are implemented; behavior mirrors Upstash semantics closely enough to validate the
// Redis-path branches without booting a real client.
type FakeEntry = { value: unknown; expireAt: number | null }

function createFakeRedis() {
  const store = new Map<string, FakeEntry>()
  function alive(key: string): FakeEntry | undefined {
    const e = store.get(key)
    if (!e) return undefined
    if (e.expireAt !== null && e.expireAt <= Date.now()) {
      store.delete(key)
      return undefined
    }
    return e
  }
  return {
    async get<T>(key: string): Promise<T | null> {
      const e = alive(key)
      return (e === undefined ? null : (e.value as T))
    },
    async set(key: string, value: unknown, opts?: { ex?: number }): Promise<'OK'> {
      const expireAt = opts?.ex ? Date.now() + opts.ex * 1000 : null
      store.set(key, { value, expireAt })
      return 'OK'
    },
    async incr(key: string): Promise<number> {
      const e = alive(key)
      const next = ((e?.value as number | undefined) ?? 0) + 1
      store.set(key, { value: next, expireAt: e?.expireAt ?? null })
      return next
    },
    async expire(key: string, seconds: number): Promise<number> {
      const e = alive(key)
      if (!e) return 0
      e.expireAt = Date.now() + seconds * 1000
      return 1
    },
    async del(key: string): Promise<number> {
      return store.delete(key) ? 1 : 0
    },
    _store: store,
    _reset: () => store.clear()
  }
}

describe('account-lockout (Redis path)', () => {
  let fake: ReturnType<typeof createFakeRedis>

  beforeEach(() => {
    fake = createFakeRedis()
    redisState.client = fake
  })

  afterEach(() => {
    redisState.client = null
    vi.useRealTimers()
  })

  it('checkLockout reads the lock key and reports unlocked when absent', async () => {
    expect(await checkLockout('user@example.com')).toEqual({ locked: false })
  })

  it('sets counter TTL only on the first failure of a streak', async () => {
    const expireSpy = vi.spyOn(fake, 'expire')
    await recordFailure('user@example.com')
    expect(expireSpy).toHaveBeenCalledTimes(1)
    await recordFailure('user@example.com')
    await recordFailure('user@example.com')
    // No additional EXPIRE calls — counter TTL is intentionally not refreshed by
    // subsequent fails so a sustained chain self-heals after 24h from first fail.
    expect(expireSpy).toHaveBeenCalledTimes(1)
  })

  it('writes the lock key with TTL when crossing the threshold', async () => {
    for (let i = 0; i < FAIL_THRESHOLD - 1; i++) {
      const r = await recordFailure('user@example.com')
      expect(r.locked).toBe(false)
    }
    const last = await recordFailure('user@example.com')
    expect(last.locked).toBe(true)
    if (last.locked) {
      expect(last.retryAfterSeconds).toBe(LOCK_TTLS_SEC[0])
    }
    const status = await checkLockout('user@example.com')
    expect(status.locked).toBe(true)
  })

  it('reports transitionedToLocked exactly once across concurrent failures crossing threshold', async () => {
    // Fire FAIL_THRESHOLD failures in parallel. INCR atomicity should ensure only the
    // single caller that observes `fails === FAIL_THRESHOLD` reports the transition.
    const results = await Promise.all(
      Array.from({ length: FAIL_THRESHOLD }, () => recordFailure('user@example.com'))
    )
    const transitions = results.filter((r) => r.transitionedToLocked).length
    expect(transitions).toBe(1)
  })

  it('extends the lock window with exponential backoff on further fails', async () => {
    for (let i = 0; i < FAIL_THRESHOLD; i++) await recordFailure('user@example.com')
    const next = await recordFailure('user@example.com')
    expect(next.locked).toBe(true)
    if (next.locked) {
      expect(next.retryAfterSeconds).toBe(LOCK_TTLS_SEC[1])
    }
    expect(next.transitionedToLocked).toBe(false)
  })

  it('clearLockout deletes both counter and lock keys', async () => {
    for (let i = 0; i < FAIL_THRESHOLD; i++) await recordFailure('user@example.com')
    expect((await checkLockout('user@example.com')).locked).toBe(true)
    await clearLockout('user@example.com')
    expect(await checkLockout('user@example.com')).toEqual({ locked: false })
    // Internal store should hold no lockout-prefixed keys.
    const remaining = Array.from(fake._store.keys()).filter((k) => k.startsWith('covenant:lockout:'))
    expect(remaining).toEqual([])
  })

  it('lock TTL is honored: status flips to unlocked after retryAfter elapses', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    for (let i = 0; i < FAIL_THRESHOLD; i++) await recordFailure('user@example.com')
    expect((await checkLockout('user@example.com')).locked).toBe(true)
    vi.setSystemTime(new Date(Date.now() + (LOCK_TTLS_SEC[0] + 1) * 1000))
    expect((await checkLockout('user@example.com')).locked).toBe(false)
  })

  it('uses hashed email keys (raw email never stored)', async () => {
    await recordFailure('victim@example.com')
    const keys = Array.from(fake._store.keys())
    expect(keys.length).toBeGreaterThan(0)
    for (const k of keys) {
      expect(k).not.toContain('victim@example.com')
      expect(k).toMatch(/^covenant:lockout:(fails|locked):[a-f0-9]{64}$/)
    }
  })
})
