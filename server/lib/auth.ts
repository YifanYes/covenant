import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { magicLink } from 'better-auth/plugins'
import { Resend } from 'resend'
import { prisma } from './prisma'
import { env } from '../config'

const resend = new Resend(env.RESEND_API_KEY)

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  secret: env.JWT_SECRET,
  baseURL: env.APP_URL,
  trustedOrigins: [env.FRONT_URL],
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET
    }
  },
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await resend.emails.send({
          from: env.FROM_EMAIL,
          to: email,
          subject: 'Sign in to ARQ',
          html: `
            <h2>Welcome to ARQ</h2>
            <p>Click the link below to sign in:</p>
            <a href="${url}">Sign in to ARQ</a>
            <p>This link will expire in 10 minutes.</p>
          `
        })
      }
    })
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24
  }
})

export type Auth = typeof auth
