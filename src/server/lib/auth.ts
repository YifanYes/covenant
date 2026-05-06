import { betterAuth } from 'better-auth'
import { createAuthMiddleware } from 'better-auth/api'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { nextCookies } from 'better-auth/next-js'
import { magicLink } from 'better-auth/plugins'
import { env } from '../config'
import { renderMagicLinkEmail, renderWelcomeEmail } from '@/server/emails/render-email'
import { createServerI18n } from './i18n-server'
import { logger } from './logger'
import { prisma } from './prisma'
import { EmailService } from '../services/email.service'
import { DEFAULT_LOCALE, resolveCreateUserLocale, resolveEmailLocale } from './auth-locale.utils'

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
      sendMagicLink: async ({ email, url }, ctx) => {
        const locale = await resolveEmailLocale(email, ctx)
        const i18n = await createServerI18n(locale)
        const html = await renderMagicLinkEmail({ url, minutes: 10, locale })
        const emailService = new EmailService()
        try {
          await emailService.sendEmail({
            to: email,
            subject: i18n.t('emails.magicLink.subject'),
            html
          })
        } catch (err) {
          logger.error({ event: 'MAGIC_LINK_EMAIL_FAILED', email, error: err }, 'Failed to send magic link email')
        }
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
        before: async (user, context) => {
          const locale = await resolveCreateUserLocale(context ?? undefined)
          return { data: { ...user, locale } }
        },
        after: async (user) => {
          logger.info({ event: 'AUTH_SIGNUP', userId: user.id }, 'User registered')
          try {
            const stored = await prisma.user.findUnique({
              where: { id: user.id },
              select: { locale: true, email: true }
            })
            const locale = stored?.locale || DEFAULT_LOCALE
            const i18n = await createServerI18n(locale)
            const html = await renderWelcomeEmail({
              locale,
              ctaUrl: `${env.NEXT_PUBLIC_APP_URL}/objectives`
            })
            const emailService = new EmailService()
            await emailService.sendEmail({
              to: user.email,
              subject: i18n.t('emails.welcome.subject'),
              html
            })
          } catch (err) {
            logger.error({ event: 'WELCOME_EMAIL_FAILED', userId: user.id, error: err }, 'Failed to send welcome email')
          }
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
