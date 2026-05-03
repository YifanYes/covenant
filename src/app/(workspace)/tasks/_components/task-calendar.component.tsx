'use client'
import CalendarNavbar from '@/components/calendars/calendar-navbar.component'
import MonthlyCalendar from '@/components/calendars/monthly-calendar.component'
import { useCalendarStore } from '@/stores/calendar.store'
import { getMonth } from '@/utils/calendar.utils'
import { trpcOptions } from '@/utils/trpc.utils'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useMemo } from 'react'

export default function TaskCalendar() {
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

  return (
    <div className="flex h-full flex-col">
      <CalendarNavbar />
      <div className="h-full flex-1">
        <MonthlyCalendar month={currentMonth} tasks={tasksData?.tasks || []} />
      </div>
    </div>
  )
}
