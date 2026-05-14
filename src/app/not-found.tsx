'use client'

import { useTranslation } from 'react-i18next'

export default function NotFound() {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h2 className="text-2xl font-bold">{t('not_found_page.title')}</h2>
      <p className="text-muted-foreground">{t('not_found_page.description')}</p>
      <a href="/dashboard" className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90">
        {t('not_found_page.go_dashboard')}
      </a>
    </div>
  )
}
