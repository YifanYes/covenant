'use client'
import Task from '@/tasks/task.component'
import type { Task as TaskType } from '@/types/models.types'
import Dialog, { DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/ui/dialog.component'
import { useTranslation } from 'react-i18next'

interface TaskSummaryListProps {
  title: string
  tasks: TaskType[]
  setSelectedTask?: (task?: TaskType) => void
}

export default function TaskSummaryList({ title, tasks, setSelectedTask }: TaskSummaryListProps) {
  const { t } = useTranslation()

  if (tasks.length <= 2) return null

  return (
    <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} className='w-fit'>
      <Dialog>
        <DialogTrigger asChild>
          <button className='text-muted-foreground hover:text-foreground w-full cursor-pointer text-left text-xs'>
            +{tasks.length - 2} {t('more')}
          </button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <ul className='flex flex-col gap-1'>
            {tasks.map((task) => (
              <Task key={task.id} task={task} setSelectedTask={setSelectedTask} hideHandle />
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  )
}
