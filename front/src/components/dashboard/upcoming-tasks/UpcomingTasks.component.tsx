import { DashboardSectionWrapperComponent } from '@/components/dashboard/dashboard-section-wrapper/DashboardSectionWrapper.component'
import {
  Carousel,
  CarouselContent,
  CarouselDots,
  CarouselItem,
  CarouselNext,
  CarouselPrevious
} from '@/components/ui/carousel'
import type { Task } from '@/types/models.types'
import { CalendarMonth } from '@nsmr/pixelart-react'
import { TaskStatus } from '@shared/schemas/tasks.schemas'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import { UpcomingTaskCardComponent } from './components/UpcomingTaskCard.component'

interface UpcomingTasksComponentProps {
  tasks: Task[]
}

export function UpcomingTasksComponent({ tasks }: UpcomingTasksComponentProps) {
  const { t } = useTranslation()

  const upcomingTasks = tasks.filter(
    (task) =>
      task.status !== TaskStatus.DONE &&
      task.dueDate &&
      (dayjs(task.dueDate) <= dayjs().add(1, 'day') || dayjs(task.dueDate) < dayjs().startOf('day'))
  )

  return (
    <DashboardSectionWrapperComponent
      title={t('dashboard.upcoming.title')}
      icon={CalendarMonth}
      iconColorClass='text-purple-500'
      className='lg:col-span-2'
      contentClassName='flex-1 px-18'
    >
      {upcomingTasks && upcomingTasks.length > 0 ? (
        <Carousel className='flex flex-1 flex-col justify-between gap-6'>
          <CarouselContent>
            {upcomingTasks.map((task, index) => (
              <CarouselItem key={index} className='flex basis-full items-stretch'>
                <UpcomingTaskCardComponent task={task} />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className='-mt-4' />
          <CarouselNext className='-mt-4' />
          <CarouselDots />
        </Carousel>
      ) : (
        <div className='flex h-full w-full flex-col items-center justify-center gap-2 text-center'>
          <p className='text-muted-foreground text-sm font-medium'>{t('dashboard.upcoming.no_tasks')}</p>
        </div>
      )}
    </DashboardSectionWrapperComponent>
  )
}
