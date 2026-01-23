import { cn } from '@/lib/cn.lib'
import type { Task } from '@/types/models.types'
import { getColorClasses } from '@/utils/theme.utils'
import { CalendarMonth } from '@nsmr/pixelart-react'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import DashboardSectionWrapperComponent from '../dashboard-section-wrapper.component'

interface UpcomingTasksComponentProps {
  tasks: Task[]
}

export default function UpcomingTasksComponent({ tasks }: UpcomingTasksComponentProps) {
  const { t } = useTranslation()

  return (
    <DashboardSectionWrapperComponent
      title={t('dashboard.upcoming.title')}
      icon={CalendarMonth}
      iconColorClass='text-purple-500'
      className='lg:col-span-2'
      contentClassName='grid gap-2 sm:grid-cols-1 rounded-md border p-4 pr-3 mx-6 h-[220px]'
    >
      {tasks && tasks.length > 0 ? (
        <div className='scrollbar-thin scrollbar-thumb-muted h-[220px] space-y-2 overflow-y-auto pr-4'>
          {tasks.map((task, index) => {
            const colorClass = task.color
              ? getColorClasses(task.color, { bg: 'bg-muted', text: 'text-muted-foreground' }).bg
              : 'bg-muted'
            const taskDate = task.dueDate ? dayjs(task.dueDate).format('DD MMM') : null

            return (
              <div key={index} className='bg-card/30 flex items-center gap-3 rounded-md border px-3 py-2'>
                <div className={cn('h-2 w-2 shrink-0 rounded-full', colorClass)} />
                <span className='text-foreground flex-1 truncate text-sm'>{task.title}</span>
                {taskDate && <span className='text-muted-foreground shrink-0 text-xs'>{taskDate}</span>}
              </div>
            )
          })}
        </div>
      ) : (
        <div className='flex h-full w-full flex-col items-center justify-center gap-2 text-center'>
          <p className='text-muted-foreground text-sm font-medium'>{t('dashboard.upcoming.no_tasks')}</p>
        </div>
      )}
    </DashboardSectionWrapperComponent>
  )
}
