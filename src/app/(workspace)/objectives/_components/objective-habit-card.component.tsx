'use client'
import { useDateFormat } from '@/hooks/use-date-format'
import type { Habit } from '@/types/models.types'
import { Repeat } from 'pixelarticons/react'
import dayjs from 'dayjs'
import { useMemo } from 'react'

interface ObjectiveHabitCardProps {
  habit: Habit
}

export default function ObjectiveHabitCard({ habit }: ObjectiveHabitCardProps) {
  const { completions = [], recurrence = 1, name } = habit
  const { formatDate } = useDateFormat()

  // Generate calendar data for the last 7 days only
  const calendarDays = useMemo(() => {
    const completionCounts = new Map<string, number>()

    completions.forEach((completion) => {
      const dateStr = formatDate(completion?.completedAt)
      completionCounts.set(dateStr, (completionCounts.get(dateStr) || 0) + 1)
    })

    return Array.from({ length: 7 }).map((_, i) => {
      const date = dayjs().subtract(6 - i, 'day')
      const count = completionCounts.get(formatDate(date)) || 0
      return {
        date: formatDate(date),
        count,
        style: count > 0 ? { opacity: Math.max(0.3, Math.min(count / recurrence, 1)) } : {},
        background: date.isAfter(dayjs(), 'day') ? 'bg-muted/10' : count > 0 ? 'bg-primary' : 'bg-muted/30'
      }
    })
  }, [completions, recurrence, formatDate])

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <div className="flex items-center gap-2">
        <div className="bg-secondary/10 text-secondary rounded-md p-1.5">
          <Repeat className="h-4 w-4" />
        </div>
        <h4 className="flex-1 truncate text-sm font-medium">{name}</h4>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map(({ date, count, background, style }, index) => (
          <div
            key={index}
            className="relative flex aspect-square items-center justify-center overflow-hidden rounded-sm"
            title={`${date}: ${count}`}
          >
            <div className={`absolute inset-0 ${background}`} style={style} />
            {count > 1 && <span className="text-background relative z-10 text-[10px] font-bold">+{count}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
