import { taskPriorityTypes } from '@/types/constants.types'
import type { Area, Task } from '@/types/models.types'
import { uniqBy } from 'es-toolkit/compat'
import type { TFunction } from 'i18next'

export const getUpcomingTaskAreas = (task: Task) =>
  uniqBy(task.objectives?.flatMap(({ areas = [] }) => areas) || [], ({ id }: Area) => id)

export const getTaskType = (
  effort: string | null | undefined,
  impact: string | null | undefined,
  t: TFunction
): string => {
  if (!effort || !impact) return '-'
  const key = taskPriorityTypes[impact]?.[effort]
  return key ? t(key) : '-'
}
