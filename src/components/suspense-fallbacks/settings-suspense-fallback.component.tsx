'use client'
import { useTranslation } from 'react-i18next'

export default function SettingsSuspenseFallback() {
  const { t } = useTranslation()
  return (
    <div className="min-h-screen w-full p-6">
      <h1 className="text-2xl font-semibold">{t('settings.title')}</h1>
      <div className="flex max-w-md flex-col gap-6 py-4">
        <div className="flex flex-col gap-2">
          <div className="bg-muted h-4 w-20 animate-pulse rounded" />
          <div className="bg-muted h-9 w-full animate-pulse rounded" />
        </div>
        <div className="flex flex-col gap-2">
          <div className="bg-muted h-4 w-24 animate-pulse rounded" />
          <div className="bg-muted h-9 w-full animate-pulse rounded" />
        </div>
        <div className="pt-4">
          <div className="bg-muted h-9 w-40 animate-pulse rounded" />
        </div>
      </div>
    </div>
  )
}
