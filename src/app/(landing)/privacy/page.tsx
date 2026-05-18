import LegalPageLayout from '../_components/legal-page-layout.component'
import { getLandingLocale } from '../_lib/locale'
import { buildPageMetadata } from '../_lib/page-metadata'

export const generateMetadata = () => buildPageMetadata({ pageKey: 'privacy', path: '/privacy' })

export default async function PrivacyPolicyPage() {
  const lang = await getLandingLocale()
  const Content = (await import(`./content.${lang}.mdx`).catch(() => import('./content.en.mdx'))).default

  return (
    <LegalPageLayout>
      <Content />
    </LegalPageLayout>
  )
}
