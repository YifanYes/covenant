import { createHash } from 'node:crypto'
import { redis } from './redis'

// Threat model
// ------------
// Lockout is keyed on email (hashed). This is intentionally simple but has a known
// tradeoff: an attacker who knows a victim's email can pin that account in a lockout
// state by submitting bad-credential attempts. Mitigations baked in:
//   * The first lock window is short (60s) and exponential backoff caps at 1h, so a
//     casual nuisance is bounded in impact.
//   * The failure counter has a 24h TTL set on the *first* fail of a streak and is
//     NOT refreshed by subsequent fails — so a sustained chain self-heals after 24h
//     of no further failures.
//   * Better Auth's per-IP rate limit (3 req / 10s on `/sign-in/**`) caps the rate
//     at which an attacker can drive the counter, regardless of source.
//   * On Redis outage, sign-in fails OPEN (see auth.ts `before` hook) so an
//     infrastructure problem cannot lock every legitimate user out.
// We accept this tradeoff in exchange for a simple, replica-shared counter. If the
// DoS surface becomes a real concern, evolve toward per-(email, IP) keys plus a
// CAPTCHA escalation rather than removing email-keyed lockout entirely.

export type LockoutStatus = { locked: false } | { locked: true; retryAfterSeconds: number }

export type RecordFailureResult = LockoutStatus & { failures: number; transitionedToLocked: boolean }

// Allow this many failed attempts before any lock kicks in. The 5th failure triggers
// the first lock; subsequent failures during a lock extend the duration.
export const FAIL_THRESHOLD = 5

// Failure counter window. Old failures are forgotten after this many seconds with no
// further failures. 24h is long enough that a slow-paced attacker (e.g. credential
// stuffing with IP rotation under the global rate limit) still accrues fails into the
// threshold rather than being able to keep the counter forever below it.
export const FAIL_COUNTER_TTL_SEC = 24 * 60 * 60

// Exponential backoff schedule, indexed by (failures - FAIL_THRESHOLD).
// fails=5 → 60s, 6 → 120s, 7 → 300s, 8 → 900s, 9 → 1800s, 10+ → 3600s.
export const LOCK_TTLS_SEC = [60, 120, 300, 900, 1800, 3600] as const

const REDIS_PREFIX = 'covenant:lockout'
const MEM_MAX_KEYS = 10_000

function emailHash(email: string): string {
  return createHash('sha256').update(email.trim().toLowerCase(), 'utf8').digest('hex')
}

function lockTtlForFailures(failures: number): number {
  const idx = Math.max(0, failures - FAIL_THRESHOLD)
  return LOCK_TTLS_SEC[Math.min(idx, LOCK_TTLS_SEC.length - 1)]
}

type MemEntry = { fails: number; failsExpireAt: number; lockedUntil: number }
const memStore = new Map<string, MemEntry>()

function memGet(k: string): MemEntry | null {
  const e = memStore.get(k)
  if (!e) return null
  const now = Date.now()
  if (e.failsExpireAt <= now && e.lockedUntil <= now) {
    memStore.delete(k)
    return null
  }
  return e
}

function memSet(k: string, e: MemEntry) {
  memStore.set(k, e)
  if (memStore.size > MEM_MAX_KEYS) {
    const oldest = memStore.keys().next().value
    if (oldest !== undefined) memStore.delete(oldest)
  }
}

export async function checkLockout(email: string): Promise<LockoutStatus> {
  if (!email) return { locked: false }
  const k = emailHash(email)
  if (redis) {
    const lockedUntil = await redis.get<number>(`${REDIS_PREFIX}:locked:${k}`)
    if (lockedUntil && Number(lockedUntil) > Date.now()) {
      const retry = Math.max(1, Math.ceil((Number(lockedUntil) - Date.now()) / 1000))
      return { locked: true, retryAfterSeconds: retry }
    }
    return { locked: false }
  }
  const e = memGet(k)
  const now = Date.now()
  if (e && e.lockedUntil > now) {
    return { locked: true, retryAfterSeconds: Math.max(1, Math.ceil((e.lockedUntil - now) / 1000)) }
  }
  return { locked: false }
}

export async function recordFailure(email: string): Promise<RecordFailureResult> {
  if (!email) return { locked: false, failures: 0, transitionedToLocked: false }
  const k = emailHash(email)
  if (redis) {
    // INCR + conditional EXPIRE + SET locked is three round-trips. If the process dies
    // between INCR and EXPIRE on a fresh key, the counter is left without a TTL —
    // accepted edge case; a stranded counter only causes earlier locking, never weaker.
    const fails = await redis.incr(`${REDIS_PREFIX}:fails:${k}`)
    if (fails === 1) {
      await redis.expire(`${REDIS_PREFIX}:fails:${k}`, FAIL_COUNTER_TTL_SEC)
    }
    if (fails >= FAIL_THRESHOLD) {
      const ttl = lockTtlForFailures(fails)
      const lockedUntil = Date.now() + ttl * 1000
      await redis.set(`${REDIS_PREFIX}:locked:${k}`, lockedUntil, { ex: ttl })
      // INCR is atomic, so exactly one concurrent caller observes `fails === FAIL_THRESHOLD`.
      // Using the counter rather than a pre-read GET avoids the GET/INCR race that
      // would otherwise let multiple callers each report `transitionedToLocked: true`.
      return {
        locked: true,
        retryAfterSeconds: ttl,
        failures: fails,
        transitionedToLocked: fails === FAIL_THRESHOLD
      }
    }
    return { locked: false, failures: fails, transitionedToLocked: false }
  }
  const now = Date.now()
  const existing = memGet(k)
  const wasLocked = !!(existing && existing.lockedUntil > now)
  const fails = existing && existing.failsExpireAt > now ? existing.fails + 1 : 1
  const failsExpireAt = existing && existing.failsExpireAt > now ? existing.failsExpireAt : now + FAIL_COUNTER_TTL_SEC * 1000
  let lockedUntil = existing && existing.lockedUntil > now ? existing.lockedUntil : 0
  if (fails >= FAIL_THRESHOLD) {
    const ttl = lockTtlForFailures(fails)
    lockedUntil = now + ttl * 1000
  }
  memSet(k, { fails, failsExpireAt, lockedUntil })
  if (lockedUntil > now) {
    return {
      locked: true,
      retryAfterSeconds: Math.max(1, Math.ceil((lockedUntil - now) / 1000)),
      failures: fails,
      transitionedToLocked: !wasLocked
    }
  }
  return { locked: false, failures: fails, transitionedToLocked: false }
}

export async function clearLockout(email: string): Promise<void> {
  if (!email) return
  const k = emailHash(email)
  if (redis) {
    await Promise.all([redis.del(`${REDIS_PREFIX}:fails:${k}`), redis.del(`${REDIS_PREFIX}:locked:${k}`)])
    return
  }
  memStore.delete(k)
}

// Test-only helper: clears the in-memory store. No-op when Redis is configured.
export function _resetLockoutMemoryStore(): void {
  memStore.clear()
}
