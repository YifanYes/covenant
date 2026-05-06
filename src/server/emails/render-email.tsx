import fs from 'fs'
import path from 'path'
import { render } from '@react-email/render'
import { createServerI18n } from '@/server/lib/i18n-server'
import MagicLinkEmail from './magic-link.email'
import WelcomeEmail from './welcome.email'

function getLogoSvg(): string {
  const svgPath = path.join(process.cwd(), 'public', 'covenant-logo.svg')
  const svg = fs.readFileSync(svgPath, 'utf-8')
  return svg.replace(/#000000/g, '#c2b29a').replace(/fill-opacity="1"/g, 'fill-opacity="1"')
}

export async function renderMagicLinkEmail({
  url,
  minutes,
  locale
}: {
  url: string
  minutes: number
  locale: string
}) {
  const i18n = await createServerI18n(locale)
  const logoSvg = getLogoSvg()

  const html = await render(
    <MagicLinkEmail
      url={url}
      preview={i18n.t('emails.magicLink.preview')}
      heading={i18n.t('emails.magicLink.heading')}
      body={i18n.t('emails.magicLink.body', { minutes })}
      cta={i18n.t('emails.magicLink.cta')}
      footer={i18n.t('emails.magicLink.footer')}
      logoSvg={logoSvg}
    />,
    { pretty: true }
  )

  return html
}

export async function renderWelcomeEmail({
  locale,
  ctaUrl
}: {
  locale: string
  ctaUrl: string
}) {
  const i18n = await createServerI18n(locale)
  const logoSvg = getLogoSvg()

  const html = await render(
    <WelcomeEmail
      preview={i18n.t('emails.welcome.preview')}
      heading={i18n.t('emails.welcome.heading')}
      body={i18n.t('emails.welcome.body')}
      cta={i18n.t('emails.welcome.cta')}
      ctaUrl={ctaUrl}
      footer={i18n.t('emails.welcome.footer')}
      logoSvg={logoSvg}
    />,
    { pretty: true }
  )

  return html
}
