import { betterAuth } from 'better-auth'
import { createAuthMiddleware } from 'better-auth/api'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { nextCookies } from 'better-auth/next-js'
import { magicLink } from 'better-auth/plugins'
import { env } from '../config'
import { logger } from './logger'
import { prisma } from './prisma'

async function sendBrevoEmail(args: { to: string; subject: string; html: string }) {
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), 5000)
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': env.BREVO_API_KEY,
        'content-type': 'application/json',
        accept: 'application/json'
      },
      body: JSON.stringify({
        sender: { email: env.FROM_EMAIL, name: 'Covenant' },
        to: [{ email: args.to }],
        subject: args.subject,
        htmlContent: args.html
      }),
      signal: ac.signal
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Failed to send email: ${res.status} ${body}`)
    }
  } finally {
    clearTimeout(timer)
  }
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  secret: env.JWT_SECRET,
  baseURL: env.NEXT_PUBLIC_APP_URL,
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET
    }
  },
  plugins: [
    nextCookies(),
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await sendBrevoEmail({
          to: email,
          subject: 'Sign in to Covenant',
          html: `
            <h2>Welcome to Covenant</h2>
            <p>Click the link below to sign in:</p>
            <a href="${url}">Sign in to Covenant</a>
            <p>This link will expire in 10 minutes.</p>
          `
        })
      }
    })
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24
  },
  databaseHooks: {
    user: {
      create: {
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
      if (!path.includes('/sign-in') && !path.includes('/magic-link')) return
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
