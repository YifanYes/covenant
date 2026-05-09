import type { Metadata } from 'next'
import LegalPageLayout from '../_components/legal-page-layout.component'
import { getLandingLocale } from '../_lib/locale'

export const metadata: Metadata = {
  title: 'Privacy Policy - Covenant',
  description: 'How Covenant collects, uses, and protects your personal data.'
}

export default async function PrivacyPolicyPage() {
  const lang = await getLandingLocale()
  const Content = (await import(`./content.${lang}.mdx`).catch(() => import('./content.en.mdx'))).default

  return (
    <LegalPageLayout>
      <Content />
    </LegalPageLayout>
  )
}
