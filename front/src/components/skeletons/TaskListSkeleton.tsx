import { PlusIcon } from 'lucide-react'
import { Button } from '../ui/button'
import TaskSkeleton from './TaskSkeleton'

export const TaskListSkeleton = () => {
  return (
    <section className='w-full py-6'>
      <header className='mb-2 flex items-center justify-between'>
        <div className='bg-muted h-5 w-24 animate-pulse rounded' />
        <Button size='sm' disabled className='cursor-not-allowed rounded-lg px-3 py-1 text-xs font-medium'>
          <PlusIcon />
        </Button>
      </header>
      <ul className='flex flex-col gap-2'>
        <TaskSkeleton />
        <TaskSkeleton />
        <TaskSkeleton />
      </ul>
    </section>
  )
}
