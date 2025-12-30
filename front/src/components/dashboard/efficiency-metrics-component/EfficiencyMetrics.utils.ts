import { parseTranslationKey } from '@/utils/locale.utils'

const getTaskTypeLabel = (type: string | null) => {
  switch (type) {
    case 'QUICK_WIN':
      return 'tasks.task_types.quick_win'
    case 'MAJOR_PROJECT':
      return 'tasks.task_types.major_project'
    case 'FILL_IN':
      return 'tasks.task_types.fill_in'
    case 'THANKLESS_TASK':
      return 'tasks.task_types.thankless_task'
    case 'NO_TASKS':
      return 'tasks.matrix.no_tasks'
    default:
      return 'dashboard.efficiency_metrics.none'
  }
}

export const getEfficiencyMetricsData = ({
  meanHabitRate,
  mostCommonType,
  mostFocusedArea,
  mostFocusedObjective
}: {
  meanHabitRate: number
  mostCommonType: string | null
  mostFocusedArea: string | null
  mostFocusedObjective: string | null
}) => {
  return {
    meanHabitRate: `${Math.round(meanHabitRate)}%`,
    mostCommonType: parseTranslationKey(getTaskTypeLabel(mostCommonType)),
    mostFocusedArea: parseTranslationKey(mostFocusedArea || 'dashboard.efficiency_metrics.none'),
    mostFocusedObjective: parseTranslationKey(mostFocusedObjective || 'dashboard.efficiency_metrics.none')
  }
}
