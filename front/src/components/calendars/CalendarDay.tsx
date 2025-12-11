import { cn } from '@/lib/utils'
import type { Task } from '@/types/models.types'
import { getColorClasses } from '@/utils/theme.utils'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'

interface CalendarDayProps {
  day: dayjs.Dayjs
  weekIndex: number
  tasks: Task[]
}

export default function CalendarDay({ day, weekIndex, tasks }: CalendarDayProps) {
  const { t } = useTranslation()
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
        {dayTasks.slice(0, 3).map((task) => {
          const colorClasses = getColorClasses(task.color, {
            bg: 'bg-blue-500',
            text: 'text-white'
          })
          return (
            <span
              key={task.id}
              className={cn('truncate rounded-sm px-1.5 text-xs', colorClasses.bg, colorClasses.text)}
            >
              {task.title}
            </span>
          )
        })}
        {dayTasks.length > 3 && (
          <span className='text-muted-foreground text-xs'>
            +{dayTasks.length - 3} {t('more')}
          </span>
        )}
      </div>
    </div>
  )
}
