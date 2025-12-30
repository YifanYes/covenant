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
import { useTranslation } from 'react-i18next'
import DashboardSectionWrapperComponent from '../dashboard-section-wrapper/DashboardSectionWrapper.component'
import UpcomingTaskCardComponent from './components/UpcomingTaskCard.component'

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
      contentClassName='flex-1 px-18'
    >
      {tasks && tasks.length > 0 ? (
        <Carousel className='align-center flex flex-1 flex-col justify-center gap-6'>
          <CarouselContent>
            {tasks.map((task, index) => (
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
