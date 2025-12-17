import CalendarNavbar from '@/components/calendars/CalendarNavbar'
import MonthlyCalendar from '@/components/calendars/MonthlyCalendar'
import { useCalendarStore } from '@/hooks/use-calendar-store'
import { getMonth } from '@/utils/calendar.utils'
import { trpc } from '@/utils/trpc.utils'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

export default function TaskCalendar() {
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
    <div className='flex h-full flex-col'>
      <CalendarNavbar />
      <div className='h-full flex-1'>
        <MonthlyCalendar month={currentMonth} tasks={tasksData?.tasks || []} />
      </div>
    </div>
  )
}
