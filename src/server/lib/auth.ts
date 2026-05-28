import { betterAuth } from 'better-auth'
import { APIError, createAuthMiddleware, isAPIError } from 'better-auth/api'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { nextCookies } from 'better-auth/next-js'
import { env } from '../config'
import { checkLockout, clearLockout, recordFailure } from './account-lockout'
import { analytics } from './analytics'
import { resolveCreateUserLocale, resolveEmailLocale } from './auth-locale.utils'
import { logger } from './logger'
import { prisma } from './prisma'
import { redis } from './redis'
import { renderEmail } from '../emails/render-email'
import { emailService } from '../services/email.service'

const redisClient = redis

// Better Auth JWTs are HS256-signed and arrive at our callbacks already trusted (they were
// just minted by Better Auth's own endpoint). Decode-only is enough to route the email
// template — verification happens server-side when the recipient clicks the link.
function decodeVerificationRequestType(token: string | undefined): string | null {
  if (!token) return null
  const segments = token.split('.')
  if (segments.length < 2) return null
  try {
    const payload = JSON.parse(Buffer.from(segments[1], 'base64url').toString('utf-8')) as unknown
    if (typeof payload === 'object' && payload !== null && 'requestType' in payload) {
      const requestType = (payload as { requestType?: unknown }).requestType
      return typeof requestType === 'string' ? requestType : null
    }
    return null
  } catch {
    return null
  }
}

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
    onPasswordReset: async ({ user }) => {
      // A successful reset proves account ownership; drop any active lockout so the
      // legitimate user can sign in immediately with the new password.
      try {
        await clearLockout(user.email)
      } catch (err) {
        logger.warn({ event: 'LOCKOUT_CLEAR_FAILED', userId: user.id, err }, 'Failed to clear lockout after password reset')
      }
    },
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
    sendVerificationEmail: async ({ user, url, token }) => {
      const locale = await resolveEmailLocale(user.email)
      // Better Auth reuses this callback for the email-change flow. When the JWT carries
      // `requestType: change-email-verification`, the click target updates the account email,
      // so render the email-change template instead of the signup verification template.
      const emailType = decodeVerificationRequestType(token) === 'change-email-verification' ? 'emailChange' : 'verification'
      const { subject, html } = await renderEmail({ type: emailType, url, locale })
      try {
        await emailService.sendEmail({ to: user.email, subject, html })
      } catch (err) {
        logger.error({ event: 'EMAIL_SEND_FAILED', type: emailType, userId: user.id, err }, 'Failed to send verification email')
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
  user: {
    changeEmail: {
      // Only `sendVerificationEmail` is wired (above). Defining `sendChangeEmailConfirmation`
      // here would put Better Auth into a two-step flow: the first click only triggers a
      // *second* email to the new address, and only the second click actually swaps the
      // account email. One-step is the expected UX — one email, click, done.
      // Verified against better-auth@1.6.9 `api/routes/update-user.mjs::changeEmail`.
      enabled: true
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
        after: async (user, context) => {
          const locale = await resolveCreateUserLocale(context ?? undefined)
          await prisma.userSettings.create({ data: { userId: user.id, locale } })
          logger.info({ event: 'AUTH_SIGNUP', userId: user.id }, 'User registered')

          const path = (context as { path?: string } | undefined)?.path
          const signupMethod: 'email' | 'google' = path?.includes('google') ? 'google' : 'email'
          const emailDomain = typeof user.email === 'string' ? (user.email.split('@')[1] ?? '') : ''
          analytics.identify(user.id, { locale, signup_at: new Date().toISOString() })
          analytics.track(user.id, 'user_signed_up', {
            signup_method: signupMethod,
            email_domain: emailDomain
          })
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
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== '/sign-in/email') return
      const body = ctx.body as { email?: unknown } | undefined
      const email = typeof body?.email === 'string' ? body.email : ''
      if (!email) return
      // Fail-open: if Redis is unreachable, do NOT block sign-in. Brute-force protection
      // degrades silently rather than locking out every legitimate user during an outage.
      // The other rate limits (Better Auth's 3/10s/IP) still apply.
      let status: Awaited<ReturnType<typeof checkLockout>>
      try {
        status = await checkLockout(email)
      } catch (err) {
        logger.error({ event: 'LOCKOUT_CHECK_FAILED', err }, 'Lockout check failed; allowing sign-in')
        return
      }
      if (!status.locked) return
      logger.warn(
        { event: 'AUTH_LOCKOUT_BLOCK', path: ctx.path, retryAfterSeconds: status.retryAfterSeconds },
        'Sign-in blocked: account temporarily locked'
      )
      throw new APIError(
        'TOO_MANY_REQUESTS',
        {
          code: 'ACCOUNT_LOCKED',
          message: 'Account temporarily locked due to too many failed sign-in attempts. Try again later.'
        },
        { 'Retry-After': String(status.retryAfterSeconds) }
      )
    }),
    after: createAuthMiddleware(async (ctx) => {
      const path = ctx.path

      // Account-lockout bookkeeping for password sign-ins. Runs ahead of the AUTH_FAILURE
      // logging block below so the `returned` shape is consumed in one place.
      if (path === '/sign-in/email') {
        const body = ctx.body as { email?: unknown } | undefined
        const email = typeof body?.email === 'string' ? body.email : ''
        if (email) {
          const returnedForLockout = ctx.context.returned
          // Bad credentials throw `APIError(UNAUTHORIZED)` with statusCode 401 — that is
          // the only path counted as a brute-force signal. Unverified-email (403),
          // disabled (400), and the lockout block itself (429) are intentionally ignored.
          if (isAPIError(returnedForLockout) && returnedForLockout.statusCode === 401) {
            try {
              const result = await recordFailure(email)
              if (result.transitionedToLocked && result.locked) {
                logger.warn(
                  {
                    event: 'AUTH_LOCKOUT_APPLIED',
                    failures: result.failures,
                    retryAfterSeconds: result.retryAfterSeconds
                  },
                  'Account locked due to repeated failed sign-in attempts'
                )
              }
            } catch (err) {
              logger.warn({ event: 'LOCKOUT_RECORD_FAILED', err }, 'Failed to record sign-in failure')
            }
          } else if (returnedForLockout instanceof Response && returnedForLockout.status < 400) {
            // Only clear on a confirmed successful HTTP response. Avoid wiping the
            // lockout when `returned` is undefined or some other unexpected shape
            // (e.g. middleware short-circuit, framework upgrade) — that would defeat
            // the lockout silently.
            try {
              await clearLockout(email)
            } catch (err) {
              logger.warn({ event: 'LOCKOUT_CLEAR_FAILED', err }, 'Failed to clear lockout after sign-in')
            }
          }
        }
      }

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
