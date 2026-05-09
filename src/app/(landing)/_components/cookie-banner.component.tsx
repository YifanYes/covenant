'use client'

import Button from '@/components/ui/button.component'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

const STORAGE_KEY = 'covenant.cookie_consent'

const safeGet = (): string | null => {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

const safeSet = (value: string): void => {
  try {
    window.localStorage.setItem(STORAGE_KEY, value)
  } catch {
    // localStorage unavailable (private mode, quota, blocked) — banner stays dismissed for this session only
  }
}

export default function CookieBanner() {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(() => !safeGet())

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setVisible(!e.newValue)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  if (!visible) return null

  const accept = () => {
    safeSet(JSON.stringify({ acceptedAt: new Date().toISOString() }))
    setVisible(false)
  }

  return (
    <div
      role="region"
      aria-label={t('landing.cookie_banner.aria_label')}
      className="bg-background/95 fixed inset-x-0 bottom-0 z-50 border-t backdrop-blur-sm"
    >
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-3 px-4 py-4 text-sm md:flex-row md:items-center md:justify-between">
        <p className="text-muted-foreground">
          {t('landing.cookie_banner.message')}{' '}
          <Link href="/privacy" className="text-foreground underline hover:no-underline">
            {t('landing.cookie_banner.learn_more')}
          </Link>
        </p>
        <Button size="sm" onClick={accept} className="shrink-0">
          {t('landing.cookie_banner.accept')}
        </Button>
      </div>
    </div>
  )
}
