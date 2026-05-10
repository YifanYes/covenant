'use client'

import { useUserPreferencesStore } from '@/stores/user-preferences.store'
import dayjs from 'dayjs'
import { useCallback } from 'react'

export function useDateFormat() {
  const dateFormat = useUserPreferencesStore((s) => s.dateFormat)
  const formatDate = useCallback(
    (date: dayjs.ConfigType) => (date ? dayjs(date).format(dateFormat) : ''),
    [dateFormat]
  )
  return { dateFormat, formatDate }
}
