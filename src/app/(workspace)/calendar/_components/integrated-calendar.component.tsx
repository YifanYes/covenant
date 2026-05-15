'use client'

import CalendarNavbar from '@/components/calendars/calendar-navbar.component'
import MonthlyCalendar from '@/components/calendars/monthly-calendar.component'
import { useCalendarStore } from '@/stores/calendar.store'
import { getMonth } from '@/utils/calendar.utils'
import { trpcOptions } from '@/utils/trpc.utils'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useMemo, useState } from 'react'
import DayDetailsSheet from './day-details-sheet.component'

export default function IntegratedCalendar() {
  const { monthIndex } = useCalendarStore()
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const timezoneOffset = new Date().getTimezoneOffset()

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

  const { data: habitsData } = useQuery(trpcOptions.habits.getAll.queryOptions())

  const { data: calendarData } = useQuery(
    trpcOptions.journaling.getMoodCalendar.queryOptions({
      month: normalizedMonthIndex,
      year,
      timezoneOffset
    })
  )

  const moodMap = useMemo(() => {
    const map = new Map<string, string | null>()
    calendarData?.days?.forEach((d) => map.set(d.date, d.mood))
    return map
  }, [calendarData])

  const handleSelectDate = (date: string) => {
    setSelectedDate(date)
    setSheetOpen(true)
  }

  const handleSheetOpenChange = (open: boolean) => {
    setSheetOpen(open)
    if (!open) {
      setSelectedDate(null)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <CalendarNavbar />
      <div className="h-full flex-1">
        <MonthlyCalendar
          month={currentMonth}
          tasks={tasksData?.tasks || []}
          moods={moodMap}
          selectedDate={selectedDate}
          onSelectDate={handleSelectDate}
        />
      </div>
      <DayDetailsSheet
        date={selectedDate}
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        tasks={tasksData?.tasks || []}
        habits={habitsData?.habits || []}
      />
    </div>
  )
}
