import type { TaskRow, TaskType } from '@/types/tasks.types'
import { useDragAndDrop } from '@formkit/drag-and-drop/react'
import { GripVertical, PlusIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from './ui/button'

const TaskSkeleton = () => (
  <li className='group border-input flex items-center gap-3 border-b-2 py-3'>
    <GripVertical className='drag-handle text-muted-foreground/40 cursor-pointer' />
    <div className='flex flex-1 flex-col gap-2'>
      <div className='bg-muted h-4 w-32 animate-pulse rounded' />
    </div>
  </li>
)

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

const Task = ({ task }: { task: TaskType }) => (
  <li className='group border-input flex items-center gap-3 border-b-2 py-3 transition-all'>
    <GripVertical className='drag-handle cursor-pointer' />
    <div className='flex flex-1 flex-col gap-1'>
      <h3 className='text-foreground text-sm font-semibold'>{task.title}</h3>
    </div>
  </li>
)

const TaskList = ({ row, group }: { row: TaskRow; group: string }) => {
  const { t } = useTranslation()

  const [parent, values, setValues] = useDragAndDrop<HTMLUListElement, TaskType>(row.items, {
    group,
    dragHandle: '.drag-handle'
  })

  const addTask = () => {
    setValues((curr: TaskType[]) => [
      ...curr,
      { id: `new_${Math.random().toString(36).slice(2, 8)}`, title: 'New task', status: 'TODO', order: 0 }
    ])
  }

  return (
    <section className='w-full py-6'>
      <header className='mb-2 flex items-center justify-between'>
        <h2 className='text-md font-medium'>{row.name}</h2>
        <Button size='sm' onClick={addTask} className='cursor-pointer rounded-lg px-3 py-1 text-xs font-medium'>
          <PlusIcon />
          {t('tasks.add')}
        </Button>
      </header>
      <ul ref={parent} className='flex flex-col gap-2' data-list-id={row.id}>
        {values.map((task: TaskType) => (
          <Task key={task.id} task={task} />
        ))}
      </ul>
    </section>
  )
}

export default TaskList
