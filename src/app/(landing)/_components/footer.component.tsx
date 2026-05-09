'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'

export default function Footer() {
  const { t } = useTranslation()
  const year = new Date().getFullYear()

  return (
    <footer className="bg-background border-t">
      <div className="text-muted-foreground mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm md:flex-row">
        <p>{t('landing.footer.copyright', { year })}</p>
        <nav className="flex items-center gap-4">
          <Link href="/tos" className="hover:text-foreground transition-colors">
            {t('landing.footer.tos')}
          </Link>
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            {t('landing.footer.privacy')}
          </Link>
        </nav>
      </div>
    </footer>
  )
}
