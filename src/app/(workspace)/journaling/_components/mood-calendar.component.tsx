'use client'

import { MOOD_COLOR_MAP } from '@shared/constants/journal.constants'
import JournalContent from './journal-content.component'
import { getMonth } from '@/utils/calendar.utils'
import { useDateFormat } from '@/hooks/use-date-format'
import Button from '@/ui/button.component'
import { trpcOptions } from '@/utils/trpc.utils'
import { useSuspenseQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { ChevronLeft, ChevronRight } from 'pixelarticons/react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

function DayEntryPanel({ date, timezoneOffset }: { date: string; timezoneOffset: number }) {
  const { t } = useTranslation()
  const { formatDate } = useDateFormat()
  const { data: entries } = useSuspenseQuery(
    trpcOptions.journaling.getByDate.queryOptions({ date, timezoneOffset })
  )

  if (!entries || entries.length === 0) {
    return (
      <div className="text-muted-foreground rounded-xl border bg-background p-4 text-sm">
        {t('journaling.no_entry_for_date')}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <div key={entry.id} className="rounded-xl border bg-background p-4">
          <p className="text-muted-foreground text-xs font-medium">{formatDate(entry.createdAt)}</p>
          <JournalContent html={entry.content} className="mt-2 text-sm" />
          {entry.mood && (
            <div className="mt-3 flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: entry.color || MOOD_COLOR_MAP.get(entry.mood) }}
              />
              <span className="text-muted-foreground text-xs">{t(`moods.${entry.mood}`)}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default function MoodCalendar() {
  const { t } = useTranslation()
  const [monthIndex, setMonthIndex] = useState(dayjs().month())
  const timezoneOffset = new Date().getTimezoneOffset()

  const targetDate = dayjs().month(monthIndex)
  const year = targetDate.year()
  const normalizedMonth = targetDate.month()

  const monthGrid = useMemo(() => getMonth(monthIndex), [monthIndex])

  const { data: calendarData } = useSuspenseQuery(
    trpcOptions.journaling.getMoodCalendar.queryOptions({ month: normalizedMonth, year, timezoneOffset })
  )

  const dayMap = useMemo(() => {
    const map = new Map<string, string | null>()
    calendarData?.days?.forEach((d) => map.set(d.date, d.mood))
    return map
  }, [calendarData])

  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const handlePrev = () => setMonthIndex((m) => m - 1)
  const handleNext = () => setMonthIndex((m) => m + 1)
  const handleToday = () => {
    setMonthIndex(dayjs().month())
    setSelectedDate(null)
  }

  const todayStr = dayjs().format('YYYY-MM-DD')
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <p className="transform-capitalize text-lg font-semibold">{targetDate.format('MMMM YYYY')}</p>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={handlePrev}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleNext}>
            <ChevronRight className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleToday}>
            {t('calendar.today')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {weekDays.map((d) => (
          <div key={d} className="text-muted-foreground text-center text-xs font-medium">
            {d}
          </div>
        ))}
        {monthGrid.slice(0, 5).flatMap((week, wi) =>
          week.map((day, di) => {
            const dateStr = day.format('YYYY-MM-DD')
            const moodId = dayMap.get(dateStr)
            const color = moodId ? MOOD_COLOR_MAP.get(moodId) : null
            const isToday = dateStr === todayStr
            const isCurrentMonth = day.month() === normalizedMonth

            return (
              <button
                key={`${wi}-${di}`}
                onClick={() => setSelectedDate(dateStr)}
                className={`flex aspect-square items-center justify-center rounded-lg text-sm transition-all ${
                  isToday ? 'ring-primary ring-2' : ''
                } ${selectedDate === dateStr ? 'ring-foreground ring-2' : ''} ${
                  !color && !isToday && selectedDate !== dateStr
                    ? 'hover:bg-muted/50'
                    : ''
                }`}
                style={{ backgroundColor: color || 'transparent' }}
              >
                <span
                  className={
                    isCurrentMonth
                      ? color
                        ? 'text-white font-medium'
                        : 'text-foreground'
                      : 'text-muted-foreground'
                  }
                >
                  {day.date()}
                </span>
              </button>
            )
          })
        )}
      </div>

      {selectedDate && <DayEntryPanel date={selectedDate} timezoneOffset={timezoneOffset} />}
    </div>
  )
}
