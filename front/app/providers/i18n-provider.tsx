'use client'

import { useEffect, useState } from 'react'
import '@/lib/i18n'

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    setIsInitialized(true)
  }, [])

  if (!isInitialized) {
    return null
  }

  return <>{children}</>
}
