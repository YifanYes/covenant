'use client'
import CalendarNavbar from '@/components/calendars/calendar-navbar.component'
import MonthlyCalendar from '@/components/calendars/monthly-calendar.component'
import { useCalendarStore } from '@/stores/calendar.store'
import { getMonth } from '@/utils/calendar.utils'
import { trpcOptions } from '@/utils/trpc.utils'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { Flag } from 'pixelarticons/react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

export default function TaskCalendar() {
  const { t } = useTranslation()
  const { monthIndex } = useCalendarStore()

  const currentMonth = useMemo(() => getMonth(monthIndex), [monthIndex])

  // Calculate year from monthIndex using dayjs to handle year rollover
  const targetDate = dayjs().month(monthIndex)
  const year = targetDate.year()
  const normalizedMonthIndex = targetDate.month()

  const { data: tasksData } = useQuery(
    trpcOptions.tasks.getByDate.queryOptions({
      monthIndex: normalizedMonthIndex.toString(),
      year: year.toString()
    })
  )

  const hasNoTasks = (tasksData?.tasks?.length ?? 0) === 0

  return (
    <div className="flex h-full flex-col">
      <CalendarNavbar />
      {hasNoTasks && (
        <div className="bg-muted/50 border-foreground/10 mb-2 flex items-center gap-2 rounded-md border px-4 py-2 text-sm">
          <Flag className="text-muted-foreground h-4 w-4 shrink-0" />
          <span className="text-muted-foreground">{t('tasks.empty_state.calendar')}</span>
        </div>
      )}
      <div className="h-full flex-1">
        <MonthlyCalendar month={currentMonth} tasks={tasksData?.tasks || []} />
      </div>
    </div>
  )
}
