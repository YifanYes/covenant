'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

type TFn = ReturnType<typeof useTranslation>['t']

function formatLastUpdated(timestamp: number, now: number, t: TFn) {
  const diff = now - timestamp
  if (diff < 10_000) return t('common.last_updated.just_now')
  if (diff < 60_000) return t('common.last_updated.seconds', { count: Math.floor(diff / 1000) })
  if (diff < 3_600_000) return t('common.last_updated.minutes', { count: Math.floor(diff / 60_000) })
  return new Date(timestamp).toLocaleTimeString()
}

interface LastUpdatedLabelProps {
  timestamp: number | undefined
}

export default function LastUpdatedLabel({ timestamp }: LastUpdatedLabelProps) {
  const { t } = useTranslation()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 15_000)
    return () => clearInterval(interval)
  }, [])

  if (!timestamp) return <span className="tabular-nums">{t('common.last_updated.never')}</span>

  return (
    <span className="tabular-nums">
      {t('common.last_updated.label', { relative: formatLastUpdated(timestamp, now, t) })}
    </span>
  )
}
