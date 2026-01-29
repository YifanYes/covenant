'use client'

import i18n from '@/lib/i18n'
import { useEffect } from 'react'

export function I18nProvider({ children, initialLang }: { children: React.ReactNode; initialLang: string }) {
  if (i18n.language !== initialLang) {
    i18n.changeLanguage(initialLang)
  }

  useEffect(() => {
    const handleLangChange = (lng: string) => {
      document.cookie = `i18nextLng=${lng}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
    }
    i18n.on('languageChanged', handleLangChange)
    return () => i18n.off('languageChanged', handleLangChange)
  }, [])

  return <>{children}</>
}
