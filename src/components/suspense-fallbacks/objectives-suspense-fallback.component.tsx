'use client'
import Button from '@/ui/button.component'
import { useTranslation } from 'react-i18next'

export default function ObjectivesSuspenseFallback() {
  const { t } = useTranslation()

  return (
    <div className="flex w-full flex-col gap-y-16 p-6">
      <section className="flex flex-col gap-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">{t('areas.title')}</h1>
          <Button disabled className="bg-muted h-9 w-30 animate-pulse cursor-not-allowed px-3"></Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-muted h-7.5 w-24 animate-pulse rounded-full border px-3" />
          ))}
        </div>
      </section>
      <section className="flex flex-col gap-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">{t('objectives.title')}</h1>
          <Button disabled className="bg-muted h-9 w-30 animate-pulse cursor-not-allowed px-3"></Button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="border-foreground/20 bg-background flex h-full w-full flex-col rounded-lg border-2 p-4"
            >
              <div className="flex items-start justify-between gap-6">
                <div className="flex flex-1 flex-col gap-1">
                  <div className="bg-muted h-4 w-3/4 animate-pulse rounded" />
                  <div className="bg-muted h-3 w-1/3 animate-pulse rounded" />
                </div>
                <div className="flex shrink-0 gap-2">
                  <div className="bg-muted size-4 animate-pulse rounded" />
                </div>
              </div>
              <div className="bg-muted mt-4 h-10 w-full animate-pulse rounded" />
              <div className="mt-4 flex flex-1 items-center justify-center border-t py-6">
                <div className="bg-muted h-3 w-24 animate-pulse rounded" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
