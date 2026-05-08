import fs from 'fs'
import path from 'path'
import { render } from '@react-email/render'
import { createServerI18n } from '@/server/lib/i18n-server'
import TransactionalEmail from './transactional-email-layout'

let cachedLogoSvg: string | null = null

function getLogoSvg(): string {
  if (cachedLogoSvg) return cachedLogoSvg
  const svgPath = path.join(process.cwd(), 'public', 'covenant-logo.svg')
  const svg = fs.readFileSync(svgPath, 'utf-8')
  cachedLogoSvg = svg.replace(/#000000/g, '#c2b29a')
  return cachedLogoSvg
}

type EmailType = 'verification' | 'passwordReset'

export async function renderEmail({
  type,
  url,
  locale
}: {
  type: EmailType
  url: string
  locale: string
}) {
  const i18n = await createServerI18n(locale)
  const logoSvg = getLogoSvg()

  const prefix = `emails.${type}`
  const html = await render(
    <TransactionalEmail
      url={url}
      preview={i18n.t(`${prefix}.preview`)}
      heading={i18n.t(`${prefix}.heading`)}
      body={i18n.t(`${prefix}.body`)}
      cta={i18n.t(`${prefix}.cta`)}
      footer={i18n.t(`${prefix}.footer`)}
      logoSvg={logoSvg}
    />,
    { pretty: true }
  )

  return { subject: i18n.t(`${prefix}.subject`), html }
}
