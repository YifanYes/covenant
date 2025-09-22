import CalendarSidebar from '@/components/calendars/CalendarSidebar'
import MonthlyCalendar from '@/components/calendars/MonthlyCalendar'
import { useCalendarStore } from '@/hooks/use-calendar-store'
import { getMonth } from '@/utils/calendar.utils'
import { trpc } from '@/utils/trpc.utils'
import { useQuery } from '@tanstack/react-query'
import { Suspense, useEffect, useState } from 'react'

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(getMonth())
  const { monthIndex } = useCalendarStore()

  const { data: tasksData } = useQuery(
    trpc.tasks.getByDate.queryOptions({
      monthIndex: monthIndex.toString(),
      year: currentMonth[0]?.[0]?.year().toString()
    })
  )

  useEffect(() => {
    setCurrentMonth(getMonth(monthIndex))
  }, [monthIndex])

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div className='flex h-screen'>
        <div className='h-full flex-1'>
          <MonthlyCalendar month={currentMonth} tasks={tasksData?.tasks || []} />
        </div>
        <div className='h-full w-60 border-l border-gray-700'>
          <CalendarSidebar />
        </div>
      </div>
    </Suspense>
  )
}
