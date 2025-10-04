import { cn } from '@/lib/utils'
import type { Task } from '@/types/models.types'
import dayjs from 'dayjs'

interface CalendarDayProps {
  day: dayjs.Dayjs
  weekIndex: number
  tasks: Task[]
}

export default function CalendarDay({ day, weekIndex, tasks }: CalendarDayProps) {
  const dayTasks = tasks.filter((task) => dayjs(task.dueDate).isSame(day, 'day'))

  const getCurrentDayClass = () =>
    day.isSame(dayjs(), 'day') ? 'bg-primary text-primary-foreground rounded-full w-7' : ''

  return (
    <div className='flex flex-col border border-gray-100'>
      <header className='flex flex-col items-center'>
        {weekIndex === 0 && <p className='mt-1 text-sm'>{day.format('ddd').toUpperCase()}</p>}
        <p className={cn('my-1 p-1 text-center text-sm', getCurrentDayClass())}>{day.format('D')}</p>
      </header>
      <div className='flex flex-col gap-1 p-1'>
        {dayTasks.map((task) => (
          <span key={task.id} className='text-muted-foreground truncate text-xs'>
            {task.title}
          </span>
        ))}
      </div>
    </div>
  )
}
