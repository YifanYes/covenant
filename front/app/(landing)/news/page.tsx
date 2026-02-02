'use client'

import { useTranslation } from 'react-i18next'

export default function NewsPage() {
  const { t } = useTranslation()

  return (
    <main className="bg-background flex min-h-screen items-center justify-center pt-16">
      <h1 className="font-title text-foreground text-4xl font-bold">{t('landing.pages.news')}</h1>
    </main>
  )
}
