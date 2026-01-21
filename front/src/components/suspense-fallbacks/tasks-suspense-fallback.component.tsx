import Button from '@/ui/button.component'
import { Plus } from '@nsmr/pixelart-react'
import { useTranslation } from 'react-i18next'
import TaskSkeleton from '../skeletons/task-skeleton.component'

export default function TasksSuspenseFallback() {
  const { t } = useTranslation()
  return (
    <div className='h-full w-full p-6'>
      <div className='flex h-full w-full flex-col gap-4'>
        <div className='flex flex-row items-center justify-between gap-4'>
          <h1 className='text-2xl font-semibold'>{t('tasks.title')}</h1>
          <div className='flex items-center gap-4'>
            <div className='bg-muted flex h-9 w-fit items-center justify-center gap-4 rounded-lg px-2'>
              {['list', 'calendar', 'table', 'matrix'].map((tab) => (
                <div key={tab} className='bg-muted-foreground/30 h-4 w-12 animate-pulse rounded' />
              ))}
            </div>
            <Button disabled className='bg-muted h-9 w-30 animate-pulse cursor-not-allowed px-3'>
              <Plus />
            </Button>
          </div>
        </div>
        <div className='flex flex-col gap-4'>
          {['DOING', 'TODO'].map((status) => (
            <section key={status} className='w-full py-4'>
              <header className='mb-3 flex items-center justify-between'>
                <div className='bg-muted h-4 w-24 animate-pulse rounded' />
              </header>
              <div className='relative isolate min-h-[80px] rounded-md border-2'>
                <ul className='flex h-full min-h-[80px] flex-col gap-1 rounded-md p-3'>
                  <TaskSkeleton />
                  <TaskSkeleton />
                  <TaskSkeleton />
                </ul>
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
