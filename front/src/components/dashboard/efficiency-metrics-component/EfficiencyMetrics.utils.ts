import type { Habit, Task } from '@/types/models.types'
import { parseTranslationKey } from '@/utils/locale.utils'
import { TaskStatus } from '@shared/schemas/tasks.schemas'
import dayjs from 'dayjs'

export const getEfficiencyMetricsData = (tasks: Task[], habits: Habit[]) => {
  const lastMonth = dayjs().subtract(1, 'month')
  const doneTasks = (tasks || []).filter(
    (task) => task.status === TaskStatus.DONE && task.updatedAt && dayjs(task.updatedAt).isAfter(lastMonth)
  )

  // 1. Mean daily habits completion rate
  const dailyHabits = (habits || []).filter((h) => h.timespan === 'daily')
  let totalCompletionRate = 0
  let daysWithHabits = 0

  if (dailyHabits.length > 0) {
    // Calculate for the last 7 days to get a representative "mean daily rate"
    for (let i = 0; i < 7; i++) {
      const date = dayjs().subtract(i, 'day').startOf('day')
      let dailyRateSum = 0
      let activeHabitsCount = 0

      dailyHabits.forEach((habit) => {
        if (dayjs(habit.createdAt).isBefore(date.endOf('day'))) {
          const completionsOnDay = (habit.completions || []).filter((c) =>
            dayjs(c.completedAt).isSame(date, 'day')
          ).length
          dailyRateSum += Math.min(completionsOnDay / habit.recurrence, 1)
          activeHabitsCount++
        }
      })

      if (activeHabitsCount > 0) {
        totalCompletionRate += dailyRateSum / activeHabitsCount
        daysWithHabits++
      }
    }
  }

  const meanHabitRate = daysWithHabits > 0 ? (totalCompletionRate / daysWithHabits) * 100 : 0

  // 2. Most common completed task type
  const typesCount: Record<string, number> = {}
  doneTasks.forEach((task) => {
    let typeLabel = parseTranslationKey('tasks.matrix.no_tasks')
    if (task.impact === 'HIGH' && task.effort === 'LOW') typeLabel = parseTranslationKey('tasks.task_types.quick_win')
    else if (task.impact === 'HIGH' && task.effort === 'HIGH')
      typeLabel = parseTranslationKey('tasks.task_types.major_project')
    else if (task.impact === 'LOW' && task.effort === 'LOW') typeLabel = parseTranslationKey('tasks.task_types.fill_in')
    else if (task.impact === 'LOW' && task.effort === 'HIGH')
      typeLabel = parseTranslationKey('tasks.task_types.thankless_task')

    typesCount[typeLabel] = (typesCount[typeLabel] || 0) + 1
  })

  const mostCommonType =
    Object.entries(typesCount).sort((a, b) => b[1] - a[1])[0]?.[0] ||
    parseTranslationKey('dashboard.completion_metrics.none')

  // 3. Most focused area (last month)
  const areaCount: Record<string, number> = {}
  doneTasks.forEach((task) => {
    task.objectives?.forEach((obj) => {
      obj.areas?.forEach((area) => {
        areaCount[area.name] = (areaCount[area.name] || 0) + 1
      })
    })
  })

  const mostFocusedAreaName =
    Object.entries(areaCount).sort((a, b) => b[1] - a[1])[0]?.[0] ||
    parseTranslationKey('dashboard.completion_metrics.none')

  const mostFocusedArea = parseTranslationKey(mostFocusedAreaName)

  // 4. Most focused objective (last month)
  const objectiveCount: Record<string, number> = {}
  doneTasks.forEach((task) => {
    task.objectives?.forEach((obj) => {
      objectiveCount[obj.name] = (objectiveCount[obj.name] || 0) + 1
    })
  })

  const mostFocusedObjective =
    Object.entries(objectiveCount).sort((a, b) => b[1] - a[1])[0]?.[0] ||
    parseTranslationKey('dashboard.completion_metrics.none')

  return {
    meanHabitRate: `${Math.round(meanHabitRate)}%`,
    mostCommonType,
    mostFocusedArea,
    mostFocusedObjective
  }
}
