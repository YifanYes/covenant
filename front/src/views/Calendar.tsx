import CalendarSidebar from '@/components/CalendarSidebar'
import MonthlyCalendar from '@/components/MonthlyCalendar'
import { useCalendarStore } from '@/hooks/use-calendar-store'
import { getMonth } from '@/utils/calendar.utils'
import { useEffect, useState } from 'react'

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(getMonth())
  const { monthIndex } = useCalendarStore()

  useEffect(() => {
    setCurrentMonth(getMonth(monthIndex))
  }, [monthIndex])

  return (
    <div className='flex h-screen'>
      <div className='h-full flex-1'>
        <MonthlyCalendar month={currentMonth} />
      </div>
      <div className='h-full w-60 border-l border-gray-700'>
        <CalendarSidebar />
      </div>
    </div>
  )
}
