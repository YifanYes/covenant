import { beforeEach, describe, expect, it, vi } from 'vitest'
import { initTRPC, TRPCError } from '@trpc/server'
import { rateLimiter } from '../../lib/rate-limiter'
import { rateLimit, RATE_LIMITS } from '../../trpc'
import type { Context } from '../../context'

function createMockContext(partial: { ip: string | null; user: { id: string } | null }): Context {
  return {
    ...partial,
    prisma: {} as Context['prisma'],
    services: {} as Context['services'],
    log: {
      warn: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      trace: vi.fn(),
      child: vi.fn()
    } as unknown as Context['log']
  } as Context
}

function createTestRouter() {
  const t = initTRPC.context<Context>().create()

  return t.router({
    public: t.procedure.use(rateLimit({ windowMs: 10_000, maxRequests: 2 })).query(() => 'ok'),

    authed: t.procedure
      .use(({ ctx, next }) => {
        if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' })
        return next({ ctx: { ...ctx, user: ctx.user } })
      })
      .use(rateLimit({ windowMs: 10_000, maxRequests: 2 }))
      .query(() => 'ok')
  })
}

describe('rateLimit middleware', () => {
  beforeEach(() => {
    rateLimiter.reset()
  })

  it('allows requests under the IP limit for public endpoints', async () => {
    const caller = createTestRouter().createCaller(createMockContext({ ip: '1.2.3.4', user: null }))
    expect(await caller.public()).toBe('ok')
    expect(await caller.public()).toBe('ok')
  })

  it('blocks requests over the IP limit for public endpoints', async () => {
    const caller = createTestRouter().createCaller(createMockContext({ ip: '1.2.3.4', user: null }))
    await caller.public()
    await caller.public()
    await expect(caller.public()).rejects.toThrow(TRPCError)
    await expect(caller.public()).rejects.toMatchObject({ code: 'TOO_MANY_REQUESTS' })
  })

  it('allows requests under the user limit for authed endpoints', async () => {
    const caller = createTestRouter().createCaller(
      createMockContext({ ip: '1.2.3.4', user: { id: 'user-1' } })
    )
    expect(await caller.authed()).toBe('ok')
    expect(await caller.authed()).toBe('ok')
  })

  it('blocks requests over the user limit for authed endpoints', async () => {
    const caller = createTestRouter().createCaller(
      createMockContext({ ip: '1.2.3.4', user: { id: 'user-1' } })
    )
    await caller.authed()
    await caller.authed()
    await expect(caller.authed()).rejects.toThrow(TRPCError)
    await expect(caller.authed()).rejects.toMatchObject({ code: 'TOO_MANY_REQUESTS' })
  })

  it('does not block authed requests based on shared IP limit', async () => {
    // Two different users behind the same IP should each have their own quota
    const callerA = createTestRouter().createCaller(
      createMockContext({ ip: '1.2.3.4', user: { id: 'user-a' } })
    )
    const callerB = createTestRouter().createCaller(
      createMockContext({ ip: '1.2.3.4', user: { id: 'user-b' } })
    )

    await callerA.authed()
    await callerA.authed()
    await expect(callerA.authed()).rejects.toMatchObject({ code: 'TOO_MANY_REQUESTS' })

    // User B should still be allowed despite same IP
    expect(await callerB.authed()).toBe('ok')
  })

  it('tracks different IPs independently', async () => {
    const callerA = createTestRouter().createCaller(createMockContext({ ip: '1.2.3.4', user: null }))
    const callerB = createTestRouter().createCaller(createMockContext({ ip: '5.6.7.8', user: null }))

    await callerA.public()
    await callerA.public()
    await expect(callerA.public()).rejects.toThrow(TRPCError)

    expect(await callerB.public()).toBe('ok')
  })

  it('tracks different users independently', async () => {
    const callerA = createTestRouter().createCaller(
      createMockContext({ ip: '1.2.3.4', user: { id: 'user-a' } })
    )
    const callerB = createTestRouter().createCaller(
      createMockContext({ ip: '5.6.7.8', user: { id: 'user-b' } })
    )

    await callerA.authed()
    await callerA.authed()
    await expect(callerA.authed()).rejects.toThrow(TRPCError)

    expect(await callerB.authed()).toBe('ok')
  })

  it('skips rate limiting when IP and user are both absent and logs a warning', async () => {
    const ctx = createMockContext({ ip: null, user: null })
    const caller = createTestRouter().createCaller(ctx)

    for (let i = 0; i < 5; i++) {
      expect(await caller.public()).toBe('ok')
    }

    expect(ctx.log.warn).toHaveBeenCalledWith(
      'Rate limit skipped: no IP or user identifier available'
    )
  })

  it('resets after the window expires', async () => {
    const t = initTRPC.context<Context>().create()

    const router = t.router({
      fast: t.procedure.use(rateLimit({ windowMs: 50, maxRequests: 1 })).query(() => 'ok')
    })

    const caller = router.createCaller(createMockContext({ ip: '1.2.3.4', user: null }))
    expect(await caller.fast()).toBe('ok')
    await expect(caller.fast()).rejects.toThrow(TRPCError)

    await new Promise((resolve) => setTimeout(resolve, 60))
    expect(await caller.fast()).toBe('ok')
  })

  it('exports preset configs', () => {
    expect(RATE_LIMITS.auth.windowMs).toBe(60_000)
    expect(RATE_LIMITS.auth.maxRequests).toBe(5)
    expect(RATE_LIMITS.write.windowMs).toBe(60_000)
    expect(RATE_LIMITS.write.maxRequests).toBe(30)
    expect(RATE_LIMITS.strict.windowMs).toBe(60_000)
    expect(RATE_LIMITS.strict.maxRequests).toBe(10)
    expect(RATE_LIMITS.combat.windowMs).toBe(60_000)
    expect(RATE_LIMITS.combat.maxRequests).toBe(60)
  })
})
