import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { nextCookies } from 'better-auth/next-js'
import { magicLink } from 'better-auth/plugins'
import { Resend } from 'resend'
import { env } from '../config'
import { prisma } from './prisma'

const resend = new Resend(env.RESEND_API_KEY)

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
        const result = await resend.emails.send({
          from: env.FROM_EMAIL,
          to: email,
          subject: 'Sign in to Covenant',
          html: `
            <h2>Welcome to Covenant</h2>
            <p>Click the link below to sign in:</p>
            <a href="${url}">Sign in to Covenant</a>
            <p>This link will expire in 10 minutes.</p>
          `
        })
        if (result.error) throw new Error(`Failed to send magic link: ${result.error.message}`)
      }
    })
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24
  }
})

export type Auth = typeof auth
