import type { Task } from '@/types/models.types'
import type { Dayjs } from 'dayjs'
import CalendarDay from './CalendarDay'

export default function MonthlyCalendar({ month, tasks }: { month: Dayjs[][]; tasks: Task[] }) {
  // Force 5 rows by slicing
  const limitedMonth = month.slice(0, 5)

  return (
    <div className='grid h-full flex-1 grid-cols-7 grid-rows-5'>
      {limitedMonth.map((week, weekIndex) =>
        week.map((day, dayIndex) => (
          <CalendarDay day={day} key={`${weekIndex}-${dayIndex}`} weekIndex={weekIndex} tasks={tasks} />
        ))
      )}
    </div>
  )
}
