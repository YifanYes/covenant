import type { Habit, Task } from '@/types/models.types'
import { Hourglass } from '@nsmr/pixelart-react'
import { Award, Compass, Flame, Target } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import DashboardSectionWrapperComponent from '../dashboard-section-wrapper/DashboardSectionWrapper.component'
import { getEfficiencyMetricsData } from './EfficiencyMetrics.utils'

interface EfficiencyMetricsComponentProps {
  tasks?: Task[]
  habits?: Habit[]
}

export default function EfficiencyMetricsComponent({ tasks, habits }: EfficiencyMetricsComponentProps) {
  const { t } = useTranslation()
  const { meanHabitRate, mostCommonType, mostFocusedArea, mostFocusedObjective } = useMemo(
    () => getEfficiencyMetricsData(tasks || [], habits || []),
    [tasks, habits]
  )

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
            <div title={meanHabitRate} className='w-full truncate text-end text-xs font-semibold'>
              {meanHabitRate}
            </div>
          </div>
          <div className='flex flex-col items-start gap-2 rounded-md border p-2'>
            <div className='text-muted-foreground flex items-center gap-1.5 text-xs leading-tight font-medium'>
              <Target className='h-3 w-3 shrink-0' />
              {t('dashboard.efficiency_metrics.task_type')}
            </div>
            <div title={mostCommonType} className='w-full truncate text-end text-xs font-semibold'>
              {mostCommonType}
            </div>
          </div>
          <div className='flex flex-col items-start gap-2 rounded-md border p-2'>
            <div className='text-muted-foreground flex items-center gap-1.5 text-xs leading-tight font-medium'>
              <Compass className='h-3 w-3 shrink-0' />
              {t('dashboard.efficiency_metrics.focused_area')}
            </div>
            <div className='w-full truncate text-end text-xs font-semibold' title={mostFocusedArea}>
              {mostFocusedArea}
            </div>
          </div>
          <div className='flex flex-col items-start gap-2 rounded-md border p-2'>
            <div className='text-muted-foreground flex items-center gap-1.5 text-xs leading-tight font-medium'>
              <Award className='h-3 w-3 shrink-0' />
              {t('dashboard.efficiency_metrics.focused_objective')}
            </div>
            <div className='w-full truncate text-end text-xs font-semibold' title={mostFocusedObjective}>
              {mostFocusedObjective}
            </div>
          </div>
        </div>
      </div>
    </DashboardSectionWrapperComponent>
  )
}
