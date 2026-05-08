import { initTRPC, TRPCError } from '@trpc/server'
import type { Context } from './context'
import { checkRateLimit, type RateLimitConfig } from './lib/rate-limiter'

export const t = initTRPC.context<Context>().create()

export const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource'
    })
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  })
})

export const rateLimit = (config: RateLimitConfig) =>
  t.middleware(async ({ ctx, next }) => {
    const ip = ctx.ip
    const userId = ctx.user?.id

    if (userId) {
      const allowed = await checkRateLimit(`user:${userId}`, config)
      if (!allowed) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: 'Rate limit exceeded. Please try again later.'
        })
      }
      return next()
    }

    if (ip) {
      const allowed = await checkRateLimit(`ip:${ip}`, config)
      if (!allowed) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: 'Rate limit exceeded. Please try again later.'
        })
      }
      return next()
    }

    ctx.log.warn('Rate limit skipped: no IP or user identifier available')
    return next()
  })

export const RATE_LIMITS = {
  auth: { windowMs: 60_000, maxRequests: 5 },
  write: { windowMs: 60_000, maxRequests: 30 },
  strict: { windowMs: 60_000, maxRequests: 10 },
  combat: { windowMs: 60_000, maxRequests: 60 }
} as const

export const createCallerFactory = t.createCallerFactory
export const protectedProcedure = t.procedure.use(isAuthed)
export const publicProcedure = t.procedure
