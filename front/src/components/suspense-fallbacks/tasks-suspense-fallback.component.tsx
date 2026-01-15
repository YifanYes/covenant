import { Button } from '@/ui'
import { Plus } from '@nsmr/pixelart-react'
import { useTranslation } from 'react-i18next'
import TaskSkeleton from '../skeletons/task-skeleton.component'

export default function TasksSuspenseFallback() {
  const { t } = useTranslation()
  return (
    <div className='min-h-screen w-full p-2'>
      <div className='flex flex-row justify-between gap-4'>
        <h1 className='text-2xl font-semibold'>{t('tasks.title')}</h1>
        <Button disabled className='bg-muted h-9 w-30 animate-pulse cursor-not-allowed px-3 py-1'>
          <Plus />
        </Button>
      </div>
      <div className='flex flex-col gap-4'>
        <section className='w-full py-7'>
          <header className='mb-4 flex items-center justify-between'>
            <div className='bg-muted h-4 w-24 animate-pulse rounded' />
          </header>
          <ul className='flex flex-col gap-2'>
            <TaskSkeleton />
            <TaskSkeleton />
            <TaskSkeleton />
          </ul>
        </section>
      </div>
    </div>
  )
}
