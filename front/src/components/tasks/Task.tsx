import { type Task as TaskType } from '@/types/models.types'
import { DragAndDrop } from '@nsmr/pixelart-react'

const Task = ({ task, setSelectedTask }: { task: TaskType; setSelectedTask: (task?: TaskType) => void }) => (
  <li
    onClick={() => setSelectedTask(task)}
    className='group border-input flex cursor-pointer items-center gap-3 border-b-1 px-2 py-4 transition-all last:border-b-0 hover:rounded-md hover:border-transparent hover:bg-gray-50/10'
  >
    <DragAndDrop className='drag-handle cursor-grab' />
    <div className='flex flex-1 flex-col gap-1'>
      <h3 className='text-foreground text-sm font-semibold'>{task.title}</h3>
    </div>
  </li>
)

export default Task
