import Task from '@/components/tasks/Task'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useTasksStore } from '@/hooks/use-tasks-store'
import { cn } from '@/lib/utils'
import type { Task as TaskType } from '@/types/models.types'
import { getColorClasses } from '@/utils/theme.utils'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'

interface CalendarDayProps {
  day: dayjs.Dayjs
  weekIndex: number
  tasks: TaskType[]
}

export default function CalendarDay({ day, weekIndex, tasks }: CalendarDayProps) {
  const { t } = useTranslation()
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
        {dayTasks.length > 2 && (
          <Dialog>
            <DialogTrigger asChild>
              <button
                className='text-muted-foreground hover:text-foreground w-full cursor-pointer text-left text-xs'
                onClick={(e) => e.stopPropagation()}
              >
                +{dayTasks.length - 2} {t('more')}
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{day.format('D MMMM YYYY')}</DialogTitle>
              </DialogHeader>
              <ul className='flex flex-col gap-1'>
                {dayTasks.map((task) => (
                  <Task key={task.id} task={task} setSelectedTask={setSelectedTask} hideHandle />
                ))}
              </ul>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  )
}
