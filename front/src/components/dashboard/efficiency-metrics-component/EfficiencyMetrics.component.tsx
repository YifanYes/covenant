import type { Habit, Task } from '@/types/models.types'
import { Hourglass } from '@nsmr/pixelart-react'
import { TaskStatus } from '@shared/schemas/tasks.schemas'
import dayjs from 'dayjs'
import { Award, Compass, Flame, Target } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import DashboardSectionWrapperComponent from '../dashboard-section-wrapper/DashboardSectionWrapper.component'

interface EfficiencyMetricsComponentProps {
  tasks?: Task[]
  habits?: Habit[]
}

export default function EfficiencyMetricsComponent({ tasks, habits }: EfficiencyMetricsComponentProps) {
  const { t, i18n } = useTranslation()

  const metrics = useMemo(() => {
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
      let typeLabel = t('tasks.matrix.no_tasks')
      if (task.impact === 'HIGH' && task.effort === 'LOW') typeLabel = t('tasks.task_types.quick_win')
      else if (task.impact === 'HIGH' && task.effort === 'HIGH') typeLabel = t('tasks.task_types.major_project')
      else if (task.impact === 'LOW' && task.effort === 'LOW') typeLabel = t('tasks.task_types.fill_in')
      else if (task.impact === 'LOW' && task.effort === 'HIGH') typeLabel = t('tasks.task_types.thankless_task')

      typesCount[typeLabel] = (typesCount[typeLabel] || 0) + 1
    })

    const mostCommonType =
      Object.entries(typesCount).sort((a, b) => b[1] - a[1])[0]?.[0] || t('dashboard.completion_metrics.none')

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
      Object.entries(areaCount).sort((a, b) => b[1] - a[1])[0]?.[0] || t('dashboard.completion_metrics.none')

    const getAreaLabel = (name: string) => {
      if (i18n.exists(name)) return t(name)
      const namespaced = `areas.${name}`
      if (i18n.exists(namespaced)) return t(namespaced)
      return name
    }

    const mostFocusedArea = getAreaLabel(mostFocusedAreaName)

    // 4. Most focused objective (last month)
    const objectiveCount: Record<string, number> = {}
    doneTasks.forEach((task) => {
      task.objectives?.forEach((obj) => {
        objectiveCount[obj.name] = (objectiveCount[obj.name] || 0) + 1
      })
    })

    const mostFocusedObjective =
      Object.entries(objectiveCount).sort((a, b) => b[1] - a[1])[0]?.[0] || t('dashboard.completion_metrics.none')

    return {
      meanHabitRate: `${Math.round(meanHabitRate)}%`,
      mostCommonType,
      mostFocusedArea,
      mostFocusedObjective
    }
  }, [tasks, habits, t, i18n])

  return (
    <DashboardSectionWrapperComponent
      title={t('dashboard.efficiency_metrics.title')}
      icon={Hourglass}
      iconColorClass='text-cyan-500'
    >
      <div className='flex-1'>
        <div className='grid h-full w-full gap-2'>
          <div className='flex flex-col items-start gap-2 rounded-md border p-2'>
            <div className='text-muted-foreground flex items-center gap-1.5 text-xs leading-tight font-medium'>
              <Flame className='h-3 w-3 shrink-0' />
              {t('dashboard.efficiency_metrics.habit_rate')}
            </div>
            <div className='w-full truncate text-end text-xs font-semibold'>{metrics.meanHabitRate}</div>
          </div>
          <div className='flex flex-col items-start gap-2 rounded-md border p-2'>
            <div className='text-muted-foreground flex items-center gap-1.5 text-xs leading-tight font-medium'>
              <Target className='h-3 w-3 shrink-0' />
              {t('dashboard.efficiency_metrics.task_type')}
            </div>
            <div className='w-full truncate text-end text-xs font-semibold'>{metrics.mostCommonType}</div>
          </div>
          <div className='flex flex-col items-start gap-2 rounded-md border p-2'>
            <div className='text-muted-foreground flex items-center gap-1.5 text-xs leading-tight font-medium'>
              <Compass className='h-3 w-3 shrink-0' />
              {t('dashboard.efficiency_metrics.focused_area')}
            </div>
            <div className='w-full truncate text-end text-xs font-semibold' title={metrics.mostFocusedArea}>
              {metrics.mostFocusedArea}
            </div>
          </div>
          <div className='flex flex-col items-start gap-2 rounded-md border p-2'>
            <div className='text-muted-foreground flex items-center gap-1.5 text-xs leading-tight font-medium'>
              <Award className='h-3 w-3 shrink-0' />
              {t('dashboard.efficiency_metrics.focused_objective')}
            </div>
            <div className='w-full truncate text-end text-xs font-semibold' title={metrics.mostFocusedObjective}>
              {metrics.mostFocusedObjective}
            </div>
          </div>
        </div>
      </div>
    </DashboardSectionWrapperComponent>
  )
}
