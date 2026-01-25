import Task from '@/tasks/task.component'
import type { Habit, Task as TaskType } from '@/types/models.types'
import Dialog, { DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/ui/dialog.component'
import { Repeat } from '@nsmr/pixelart-react'
import { TaskStatus } from '@shared/schemas/tasks.schemas'
import { useTranslation } from 'react-i18next'
import ObjectiveHabitCard from './objective-habit-card.component'

interface ObjectiveSummaryListProps {
  title: string
  tasks: TaskType[]
  habits: Habit[]
  setSelectedTask?: (task?: TaskType) => void
}

export default function ObjectiveSummaryList({ title, tasks, habits, setSelectedTask }: ObjectiveSummaryListProps) {
  const { t } = useTranslation()
  const pendingTasks = tasks.filter((task) => task.status !== TaskStatus.DONE)

  const tasksShown = Math.min(pendingTasks.length, 2)
  const habitsShown = Math.min(habits.length, Math.max(0, 2 - tasksShown))
  const extraTasks = pendingTasks.length - tasksShown
  const extraHabits = habits.length - habitsShown

  const seeMoreParts: string[] = []
  if (extraTasks > 0) seeMoreParts.push(t('objectives.tasks_count', { count: extraTasks }))
  if (extraHabits > 0) seeMoreParts.push(t('objectives.habits_count', { count: extraHabits }))

  return (
    <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} className='h-full w-full'>
      <Dialog>
        <DialogTrigger asChild>
          <div className='group hover:bg-background/80 relative flex min-h-20 cursor-pointer flex-col gap-2 p-3 transition-all duration-200'>
            {/* Corner brackets */}
            <span className='border-foreground/30 group-hover:border-primary pointer-events-none absolute top-0 left-0 h-3 w-3 border-t-2 border-l-2 transition-colors' />
            <span className='border-foreground/30 group-hover:border-primary pointer-events-none absolute top-0 right-0 h-3 w-3 border-t-2 border-r-2 transition-colors' />
            <span className='border-foreground/30 group-hover:border-primary pointer-events-none absolute bottom-0 left-0 h-3 w-3 border-b-2 border-l-2 transition-colors' />
            <span className='border-foreground/30 group-hover:border-primary pointer-events-none absolute right-0 bottom-0 h-3 w-3 border-r-2 border-b-2 transition-colors' />
            <div className='flex flex-col gap-1'>
              {pendingTasks.slice(0, 2).map((task) => (
                <div key={task.id} className='flex items-center gap-2'>
                  <div className='bg-primary size-1.5 rounded-full' />
                  <span className='text-foreground text-xs'>{task.title}</span>
                </div>
              ))}
              {habits.slice(0, Math.max(0, 2 - pendingTasks.length)).map((habit) => (
                <div key={habit.id} className='flex items-center gap-2'>
                  <Repeat className='text-secondary size-3' />
                  <span className='text-foreground text-xs'>{habit.name}</span>
                </div>
              ))}
            </div>
            {seeMoreParts.length > 0 && (
              <span className='text-muted-foreground text-xs'>+{seeMoreParts.join(', ')}</span>
            )}
          </div>
        </DialogTrigger>
        <DialogContent className='sm:max-w-[700px]'>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className='mt-4 grid h-[80vh] max-h-[600px] min-h-[200px] grid-cols-1 gap-6 md:grid-cols-2'>
            {/* Tasks Column */}
            <div className='flex min-h-0 flex-col gap-3 md:pr-6'>
              <h3 className='text-base font-semibold'>{t('tasks.title')}</h3>
              <div className='-mr-4 flex-1 overflow-y-auto rounded-lg border p-4 pr-5'>
                {pendingTasks.length > 0 ? (
                  <div className='flex flex-col gap-2'>
                    {pendingTasks.map((task) => (
                      <div key={task.id} className='rounded-lg border p-2'>
                        <Task task={task} setSelectedTask={setSelectedTask} hideHandle hideHover />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className='text-muted-foreground flex h-full items-center justify-center py-6 text-center text-sm italic'>
                    {t('objectives.no_tasks')}
                  </p>
                )}
              </div>
            </div>
            {/* Habits Column */}
            <div className='flex min-h-0 flex-col gap-3'>
              <h3 className='text-base font-semibold'>{t('habits.title')}</h3>
              <div className='-mr-4 flex-1 overflow-y-auto rounded-lg border p-4 pr-5'>
                {habits.length > 0 ? (
                  <div className='flex flex-col gap-2'>
                    {habits.map((habit) => (
                      <ObjectiveHabitCard key={habit.id} habit={habit} />
                    ))}
                  </div>
                ) : (
                  <p className='text-muted-foreground flex h-full items-center justify-center py-6 text-center text-sm italic'>
                    {t('objectives.no_habits')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
