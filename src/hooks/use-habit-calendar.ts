'use client'

import { useDateFormat } from '@/hooks/use-date-format'
import type { Habit } from '@/types/models.types'
import dayjs from 'dayjs'
import { useMemo } from 'react'

export type CalendarCell = {
  date: string
  count: number
  style: React.CSSProperties
  background: string
}

export function getCellOpacity(count: number): number {
  if (count <= 0) return 0
  if (count === 1) return 0.3
  if (count === 2) return 0.55
  if (count === 3) return 0.8
  return 1
}

export function useHabitCalendar(habit: Habit, days = 36): CalendarCell[] {
  const { formatDate } = useDateFormat()
  const { completions = [] } = habit

  return useMemo(() => {
    const completionCounts = new Map<string, number>()
    completions.forEach((completion) => {
      const dateStr = formatDate(completion?.completedAt)
      completionCounts.set(dateStr, (completionCounts.get(dateStr) || 0) + 1)
    })

    return Array.from({ length: days }).map((_, i) => {
      const date = dayjs().subtract(days - 1 - i, 'day')
      const count = completionCounts.get(formatDate(date)) || 0
      const isFuture = date.isAfter(dayjs(), 'day')
      return {
        date: formatDate(date),
        count,
        style: count > 0 ? { opacity: getCellOpacity(count) } : {},
        background: isFuture ? 'bg-muted/10' : count > 0 ? 'bg-primary' : 'bg-muted/30'
      }
    })
  }, [completions, formatDate, days])
}
