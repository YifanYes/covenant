import TaskMatrixQuadrantCard, { type Quadrant } from '@/components/tasks/TaskMatrixQuadrantCard'
import { useTasksStore } from '@/hooks/use-tasks-store'
import type { Task } from '@/types/models.types'
import { trpc } from '@/utils/trpc.utils'
import { TaskEffort, TaskImpact } from '@shared/schemas/tasks.schemas'
import { useQuery } from '@tanstack/react-query'
import { flatten, values as getValues, isUndefined, filter as lodashFilter } from 'es-toolkit/compat'
import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

export default function TaskMatrix() {
  const { t } = useTranslation()
  const { data } = useQuery(trpc.tasks.getAll.queryOptions())
  const { tasks, setTasks, setSelectedTask } = useTasksStore()

  useEffect(() => {
    !isUndefined(data?.tasks) && setTasks(data?.tasks)
  }, [data, setTasks])

  const allTasks = useMemo(() => {
    return flatten(getValues(tasks))
  }, [tasks])

  // Filter tasks that have both effort and impact set
  const tasksWithPriority = useMemo(() => {
    return lodashFilter(allTasks, (task: Task) => Boolean(task.effort && task.impact))
  }, [allTasks])

  const quadrants: Quadrant[] = useMemo(() => {
    return [
      {
        key: 'quick_win',
        titleKey: 'tasks.task_types.quick_win',
        subtitleKey: 'tasks.matrix.high_impact_low_effort',
        bgColor: 'border-2 border-green-400 dark:border-green-600 bg-green-600/20 dark:bg-green-600/20',
        textColor: 'text-white',
        tasks: lodashFilter(
          tasksWithPriority,
          (task: Task) => task.impact === TaskImpact.HIGH && task.effort === TaskEffort.LOW
        )
      },
      {
        key: 'major_project',
        titleKey: 'tasks.task_types.major_project',
        subtitleKey: 'tasks.matrix.high_impact_high_effort',
        bgColor: 'border-2 border-blue-400 dark:border-blue-600 bg-blue-600/20 dark:bg-blue-600/20',
        textColor: 'text-white',
        tasks: lodashFilter(
          tasksWithPriority,
          (task: Task) => task.impact === TaskImpact.HIGH && task.effort === TaskEffort.HIGH
        )
      },
      {
        key: 'fill_in',
        titleKey: 'tasks.task_types.fill_in',
        subtitleKey: 'tasks.matrix.low_impact_low_effort',
        bgColor: 'border-2 border-slate-400 dark:border-slate-600 bg-slate-600/20 dark:bg-slate-600/20',
        textColor: 'text-gray-800 dark:text-gray-100',
        tasks: lodashFilter(
          tasksWithPriority,
          (task: Task) => task.impact === TaskImpact.LOW && task.effort === TaskEffort.LOW
        )
      },
      {
        key: 'thankless_task',
        titleKey: 'tasks.task_types.thankless_task',
        subtitleKey: 'tasks.matrix.low_impact_high_effort',
        bgColor: 'border-2 border-zinc-400 dark:border-zinc-600 bg-zinc-600/20 dark:bg-zinc-600/20',
        textColor: 'text-gray-800 dark:text-gray-100',
        tasks: lodashFilter(
          tasksWithPriority,
          (task: Task) => task.impact === TaskImpact.LOW && task.effort === TaskEffort.HIGH
        )
      }
    ]
  }, [tasksWithPriority])

  return (
    <div className='grid h-full grid-cols-2 gap-2'>
      {quadrants.map((quadrant) => (
        <TaskMatrixQuadrantCard key={quadrant.key} quadrant={quadrant} t={t} onTaskClick={setSelectedTask} />
      ))}
    </div>
  )
}
