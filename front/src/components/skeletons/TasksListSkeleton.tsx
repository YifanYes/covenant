import TaskSkeleton from './TaskSkeleton'

export default function TasksListSkeleton() {
  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-col gap-4'>
        <div className='flex flex-col gap-2'>
          <div className='bg-muted h-6 w-24 animate-pulse rounded' />
          <ul className='flex flex-col gap-2'>
            <TaskSkeleton />
            <TaskSkeleton />
            <TaskSkeleton />
          </ul>
        </div>

        <div className='mt-4 flex flex-col gap-2'>
          <div className='bg-muted h-6 w-24 animate-pulse rounded' />
          <ul className='flex flex-col gap-2'>
            <TaskSkeleton />
            <TaskSkeleton />
          </ul>
        </div>
      </div>
    </div>
  )
}
