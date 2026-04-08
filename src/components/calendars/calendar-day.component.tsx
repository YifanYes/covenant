'use client'
import { cn } from '@/lib/cn.lib'
import { useTasksStore } from '@/stores/tasks.store'
import TaskSummaryList from '@/tasks/task-summary-list.component'
import type { Task as TaskType } from '@/types/models.types'
import { getColorClasses } from '@/utils/theme.utils'
import dayjs from 'dayjs'

interface CalendarDayProps {
  day: dayjs.Dayjs
  weekIndex: number
  tasks: TaskType[]
}

export default function CalendarDay({ day, weekIndex, tasks }: CalendarDayProps) {
  const { setSelectedTask } = useTasksStore()
  const dayTasks = tasks.filter((task) => dayjs(task.dueDate).isSame(day, 'day'))

  const getCurrentDayClass = () =>
    day.isSame(dayjs(), 'day') ? 'bg-primary text-primary-foreground rounded-full w-7' : ''

  return (
    <div className='flex flex-col border-2'>
      <header className='flex flex-col items-center'>
        {weekIndex === 0 && <p className='mt-1 text-sm'>{day.format('ddd').toUpperCase()}</p>}
        <p className={cn('my-1 p-1 text-center text-sm', getCurrentDayClass())}>{day.format('D')}</p>
      </header>
      <div className='flex flex-col gap-1 p-1'>
        {dayTasks.slice(0, 2).map((task) => {
          const colorClasses = getColorClasses(task.color, {
            bg: 'bg-muted',
            text: 'text-card-foreground'
          })
          return (
            <button
              key={task.id}
              onClick={(e) => {
                e.stopPropagation()
                setSelectedTask(task)
              }}
              className={cn(
                'flex cursor-pointer items-center gap-1.5 overflow-hidden rounded border-2 px-1 py-0.5 text-xs transition-colors',
                colorClasses.bg,
                colorClasses.text
              )}
            >
              <span className='truncate font-medium'>{task.title}</span>
            </button>
          )
        })}
        <TaskSummaryList title={day.format('D MMMM YYYY')} setSelectedTask={setSelectedTask} tasks={dayTasks} />
      </div>
    </div>
  )
}
