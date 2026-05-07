import { betterAuth } from 'better-auth'
import { createAuthMiddleware } from 'better-auth/api'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { nextCookies } from 'better-auth/next-js'
import { env } from '../config'
import { logger } from './logger'
import { prisma } from './prisma'
import { resolveCreateUserLocale } from './auth-locale.utils'

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  secret: env.JWT_SECRET,
  baseURL: env.NEXT_PUBLIC_APP_URL,
  emailAndPassword: { enabled: true, autoSignIn: true, minPasswordLength: 8, maxPasswordLength: 128 },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET
    }
  },
  plugins: [
    nextCookies()
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24
  },
  // Auth paths are explicitly rate-limited to 3 req/10s per IP. Other paths fall back to the
  // global limit of 100 req/10s. Disabled in test to avoid hitting limits during automated flows.
  // Storage is in-memory per instance (sufficient now; switch to secondaryStorage if distributed).
  rateLimit: {
    enabled: env.NODE_ENV !== 'test',
    window: 10,
    max: 100,
    customRules: {
      '/sign-in/**': { window: 10, max: 3 },
      '/sign-up/**': { window: 10, max: 3 },
      '/change-password/**': { window: 10, max: 3 },
      '/change-email/**': { window: 10, max: 3 }
    }
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user, context) => {
          const locale = await resolveCreateUserLocale(context ?? undefined)
          return { data: { ...user, locale } }
        },
        after: async (user) => {
          logger.info({ event: 'AUTH_SIGNUP', userId: user.id }, 'User registered')
        }
      }
    },
    session: {
      create: {
        after: async (session) => {
          logger.info(
            { event: 'AUTH_LOGIN', userId: session.userId, ipAddress: session.ipAddress, userAgent: session.userAgent },
            'User login'
          )
        }
      },
      delete: {
        before: async (session) => {
          logger.info({ event: 'AUTH_SESSION_DELETED', userId: session.userId }, 'Session deleted')
        }
      }
    }
  },
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      const path = ctx.path
      if (!path.startsWith('/sign-in') && !path.startsWith('/sign-up')) return
      const returned = ctx.context.returned
      if (!(returned instanceof Response)) return

      if (returned.status >= 300 && returned.status < 400) {
        const location = returned.headers.get('location') ?? ''
        if (!location.includes('error=')) return
        try {
          const url = new URL(location, env.NEXT_PUBLIC_APP_URL)
          const error = url.searchParams.get('error')
          logger.warn({ event: 'AUTH_FAILURE', path, error }, 'Auth attempt failed')
        } catch {
          logger.warn({ event: 'AUTH_FAILURE', path }, 'Auth attempt failed')
        }
        return
      }

      if (returned.status >= 400 && returned.status < 500) {
        try {
          const body = await returned.clone().json() as { message?: string }
          logger.warn({ event: 'AUTH_FAILURE', path, status: returned.status, error: body?.message }, 'Auth attempt failed')
        } catch {
          logger.warn({ event: 'AUTH_FAILURE', path, status: returned.status }, 'Auth attempt failed')
        }
      }
    })
  }
})

export type Auth = typeof auth
