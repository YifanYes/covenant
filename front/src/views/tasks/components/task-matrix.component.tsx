import { useTasksStore } from '@/stores/tasks.store'
import type { Task } from '@/types/models.types'
import { getPriorityStyles, getPriorityTextColors } from '@/utils/theme.utils'
import { trpc } from '@/utils/trpc.utils'
import { TaskEffort, TaskImpact, TaskStatus } from '@shared/schemas/tasks.schemas'
import { useQuery } from '@tanstack/react-query'
import { flatten, values as getValues, isUndefined, filter as lodashFilter } from 'es-toolkit/compat'
import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import TaskMatrixQuadrantCard, { type Quadrant } from './task-matrix-quadrant-card.component'

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

  // Filter tasks that have both effort and impact set, and are not completed
  const tasksWithPriority = useMemo(() => {
    return lodashFilter(allTasks, (task: Task) =>
      Boolean(task.effort && task.impact && task.status !== TaskStatus.DONE)
    )
  }, [allTasks])

  const quadrants: Quadrant[] = useMemo(() => {
    return [
      {
        key: 'quick_win',
        titleKey: 'tasks.task_types.quick_win',
        subtitleKey: 'tasks.matrix.high_impact_low_effort',
        bgColor: `border-2 ${getPriorityStyles(TaskEffort.LOW, TaskImpact.HIGH)}`,
        ...getPriorityTextColors(TaskEffort.LOW, TaskImpact.HIGH),
        tasks: lodashFilter(
          tasksWithPriority,
          (task: Task) => task.impact === TaskImpact.HIGH && task.effort === TaskEffort.LOW
        )
      },
      {
        key: 'major_project',
        titleKey: 'tasks.task_types.major_project',
        subtitleKey: 'tasks.matrix.high_impact_high_effort',
        bgColor: `border-2 ${getPriorityStyles(TaskEffort.HIGH, TaskImpact.HIGH)}`,
        ...getPriorityTextColors(TaskEffort.HIGH, TaskImpact.HIGH),
        tasks: lodashFilter(
          tasksWithPriority,
          (task: Task) => task.impact === TaskImpact.HIGH && task.effort === TaskEffort.HIGH
        )
      },
      {
        key: 'fill_in',
        titleKey: 'tasks.task_types.fill_in',
        subtitleKey: 'tasks.matrix.low_impact_low_effort',
        bgColor: `border-2 ${getPriorityStyles(TaskEffort.LOW, TaskImpact.LOW)}`,
        ...getPriorityTextColors(TaskEffort.LOW, TaskImpact.LOW),
        tasks: lodashFilter(
          tasksWithPriority,
          (task: Task) => task.impact === TaskImpact.LOW && task.effort === TaskEffort.LOW
        )
      },
      {
        key: 'thankless_task',
        titleKey: 'tasks.task_types.thankless_task',
        subtitleKey: 'tasks.matrix.low_impact_high_effort',
        bgColor: `border-2 ${getPriorityStyles(TaskEffort.HIGH, TaskImpact.LOW)}`,
        ...getPriorityTextColors(TaskEffort.HIGH, TaskImpact.LOW),
        tasks: lodashFilter(
          tasksWithPriority,
          (task: Task) => task.impact === TaskImpact.LOW && task.effort === TaskEffort.HIGH
        )
      }
    ]
  }, [tasksWithPriority])

  return (
    <div className='grid h-full grid-cols-2 grid-rows-2 gap-2'>
      {quadrants.map((quadrant) => (
        <TaskMatrixQuadrantCard key={quadrant.key} quadrant={quadrant} t={t} onTaskClick={setSelectedTask} />
      ))}
    </div>
  )
}
