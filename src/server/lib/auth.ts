import { betterAuth } from 'better-auth'
import { createAuthMiddleware } from 'better-auth/api'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { nextCookies } from 'better-auth/next-js'
import { env } from '../config'
import { resolveCreateUserLocale, resolveEmailLocale } from './auth-locale.utils'
import { logger } from './logger'
import { prisma } from './prisma'
import { redis } from './redis'
import { renderEmail } from '../emails/render-email'
import { emailService } from '../services/email.service'

const redisClient = redis

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  secret: env.JWT_SECRET,
  baseURL: env.NEXT_PUBLIC_APP_URL,
  // Use Upstash for session/rate-limit storage when available so state survives restarts
  // and holds across replicas. Falls back to per-instance memory in dev/test/no-Redis.
  ...(redisClient && {
    secondaryStorage: {
      get: async (key: string) => {
        const value = await redisClient.get<string>(key)
        return value ?? null
      },
      set: async (key: string, value: string, ttl?: number) => {
        if (ttl) {
          await redisClient.set(key, value, { ex: ttl })
        } else {
          await redisClient.set(key, value)
        }
      },
      delete: async (key: string) => {
        await redisClient.del(key)
      }
    }
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    requireEmailVerification: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    // Revoke all sessions when a password is reset. This matches the behavior promised in
    // the reset-password page copy and closes the window where a stolen session token
    // would survive a credential rotation.
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      const locale = await resolveEmailLocale(user.email)
      const { subject, html } = await renderEmail({ type: 'passwordReset', url, locale })
      try {
        await emailService.sendEmail({ to: user.email, subject, html })
      } catch (err) {
        logger.error({ event: 'EMAIL_SEND_FAILED', type: 'passwordReset', userId: user.id, err }, 'Failed to send password reset email')
        throw err
      }
    }
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      const locale = await resolveEmailLocale(user.email)
      const { subject, html } = await renderEmail({ type: 'verification', url, locale })
      try {
        await emailService.sendEmail({ to: user.email, subject, html })
      } catch (err) {
        logger.error({ event: 'EMAIL_SEND_FAILED', type: 'verification', userId: user.id, err }, 'Failed to send verification email')
        throw err
      }
    }
  },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET
    }
  },
  // Only auto-link verified social providers to existing email-matching accounts.
  // Better Auth's `accountLinking` with `trustedProviders: ['google']` links social
  // accounts to existing email-matching accounts only when the social provider is in
  // the trusted list. Because `requireEmailVerification: true` is set above, any
  // password account created by an attacker is unverified; Google sign-in on the same
  // email will link to the verified Google account rather than inheriting the
  // unverified password account. Verified in better-auth@1.6.9 source:
  // `api/routes/callback.ts` checks `trustedProviders` before linking.
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ['google'],
      allowDifferentEmails: false
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
  // When `secondaryStorage` is set above, Better Auth uses it for rate-limit state too.
  rateLimit: {
    enabled: env.NODE_ENV !== 'test',
    window: 10,
    max: 100,
    customRules: {
      '/sign-in/**': { window: 10, max: 3 },
      '/sign-up/**': { window: 10, max: 3 },
      '/change-password/**': { window: 10, max: 3 },
      '/change-email/**': { window: 10, max: 3 },
      // Endpoint paths confirmed against `node_modules/better-auth/dist/api/routes/password.mjs`:
      // POST /request-password-reset (email send), GET /reset-password/:token (token-validation
      // callback), POST /reset-password (actual password change). All three need explicit caps —
      // otherwise abuse falls back to the global 100 req/10s rule.
      '/request-password-reset/**': { window: 60, max: 3 },
      '/reset-password/**': { window: 60, max: 5 },
      '/send-verification-email/**': { window: 60, max: 3 }
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
      // `ctx.context.returned` is an internal Better Auth response property used to
      // inspect the outcome of auth endpoints. This was verified against better-auth@1.6.9.
      // If upgrading Better Auth, confirm this property still exists in the middleware context.
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
          const body = await returned.clone().json()
          const message =
            typeof body === 'object' && body !== null && 'message' in body && typeof body.message === 'string'
              ? body.message
              : undefined
          logger.warn({ event: 'AUTH_FAILURE', path, status: returned.status, error: message }, 'Auth attempt failed')
        } catch {
          logger.warn({ event: 'AUTH_FAILURE', path, status: returned.status }, 'Auth attempt failed')
        }
      }
    })
  }
})

export type Auth = typeof auth
