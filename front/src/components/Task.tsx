import { useTasksStore } from '@/hooks/use-tasks-store'
import { type Task } from '@/types/models.types'
import { useDragAndDrop } from '@formkit/drag-and-drop/react'
import { map } from 'es-toolkit/compat'
import { GripVertical, PlusIcon } from 'lucide-react'
import { useEffect } from 'react'
import type { TaskStatus } from '../../../server/schemas/tasks.schemas'
import { Button } from './ui/button'

export type TaskRow = {
  id: string
  name: string
  items: Task[]
}

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

const TaskItem = ({ task, setSelectedTask }: { task: Task; setSelectedTask: (task?: Task) => void }) => (
  <li
    onClick={() => setSelectedTask(task)}
    className='group border-input flex cursor-pointer items-center gap-3 border-b-2 py-4 transition-all hover:bg-gray-50/10'
  >
    <GripVertical className='drag-handle cursor-grab' />
    <div className='flex flex-1 flex-col gap-1'>
      <h3 className='text-foreground text-sm font-semibold'>{task.title}</h3>
    </div>
  </li>
)

const TaskList = ({ id, group, mutation }: { id: string; group: string; mutation: any }) => {
  const { tasks, setSelectedTask } = useTasksStore()
  const [parent, values, setValues] = useDragAndDrop<HTMLUListElement, Task>(tasks?.[id] ?? [], {
    group,
    dragHandle: '.drag-handle',
    handleNodeDrop: (event, state) =>
      mutation.debouncedMutate({
        ...event.targetData.node.data.value,
        status: state.currentParent.el.dataset.listId as TaskStatus,
        order: state.targetIndex
      })
  })

  useEffect(() => {
    setValues(tasks?.[id])
  }, [tasks, id, setValues])

  return (
    <section className='w-full py-6'>
      <header className='mb-2 flex items-center justify-between'>
        <h2 className='text-md font-medium'>{id}</h2>
      </header>
      <ul ref={parent} className='flex flex-col' data-list-id={id}>
        {map(values, (task: Task) => (
          <TaskItem key={task.id} task={task} setSelectedTask={setSelectedTask} />
        ))}
      </ul>
    </section>
  )
}

export default TaskList
