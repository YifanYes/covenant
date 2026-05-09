import type { Metadata } from 'next'
import LegalPageLayout from '../_components/legal-page-layout.component'
import { getLandingLocale } from '../_lib/locale'

export const metadata: Metadata = {
  title: 'Terms of Service - Covenant',
  description: 'The terms governing your use of Covenant.'
}

export default async function TermsOfServicePage() {
  const lang = await getLandingLocale()
  const Content = (await import(`./content.${lang}.mdx`).catch(() => import('./content.en.mdx'))).default

  return (
    <LegalPageLayout>
      <Content />
    </LegalPageLayout>
  )
}
