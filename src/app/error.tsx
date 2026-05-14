'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useTranslation()

  useEffect(() => {
    // Next.js catches these before Sentry can — must report manually
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h2 className="text-2xl font-bold">{t('error_page.title')}</h2>
      <p className="text-muted-foreground">{error.message}</p>
      <button
        onClick={() => reset()}
        className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
      >
        {t('error_page.try_again')}
      </button>
    </div>
  )
}
