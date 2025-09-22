import type { Task } from '@/types/models.types'
import type { Dayjs } from 'dayjs'
import CalendarDay from './CalendarDay'

export default function MonthlyCalendar({ month, tasks }: { month: Dayjs[][]; tasks: Task[] }) {
  return (
    <div className='grid h-full flex-1 grid-cols-7 grid-rows-5'>
      {month.map((week, weekIndex) =>
        week.map((day, dayIndex) => (
          <CalendarDay day={day} key={`${weekIndex}-${dayIndex}`} weekIndex={weekIndex} tasks={tasks} />
        ))
      )}
    </div>
  )
}
