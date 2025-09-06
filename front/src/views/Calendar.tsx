import CalendarSidebar from '@/components/CalendarSidebar'
import MonthlyCalendar from '@/components/MonthlyCalendar'
import { getMonth } from '@/utils/calendar.utils'
import { useState } from 'react'

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(getMonth())

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
