import { env } from '../config'
import { logger } from '../lib/logger'

export class EmailService {
  async sendEmail(args: { to: string; subject: string; html: string }): Promise<void> {
    if (!env.BREVO_API_KEY || !env.FROM_EMAIL) {
      if (env.NODE_ENV === 'production') {
        throw new Error('Email send attempted without BREVO_API_KEY / FROM_EMAIL configured')
      }
      logger.warn(
        { to: args.to, subject: args.subject },
        'BREVO_API_KEY / FROM_EMAIL not set; skipping email send (dev/test only)'
      )
      return
    }

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
        const body = await res.text().catch(() => '<unreadable>')
        throw new Error(`Failed to send email: ${res.status} ${body}`)
      }
    } finally {
      clearTimeout(timer)
    }
  }
}

export const emailService = new EmailService()
