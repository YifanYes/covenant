import LegalPageLayout from '../_components/legal-page-layout.component'
import { getLandingLocale } from '../_lib/locale'
import { buildPageMetadata } from '../_lib/page-metadata'

export const generateMetadata = () => buildPageMetadata({ pageKey: 'tos', path: '/tos' })

export default async function TermsOfServicePage() {
  const lang = await getLandingLocale()
  const Content = (await import(`./content.${lang}.mdx`).catch(() => import('./content.en.mdx'))).default

  return (
    <LegalPageLayout>
      <Content />
    </LegalPageLayout>
  )
}
