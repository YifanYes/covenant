import { Bullseye, Hourglass, Search, SpeedFast, TrendingUp } from '@nsmr/pixelart-react'
import { useTranslation } from 'react-i18next'
import DashboardSectionWrapperComponent from '../dashboard-section-wrapper.component'
import { getEfficiencyMetricsData } from './efficiency-metrics.utils'

interface EfficiencyMetricsComponentProps {
  metrics: {
    meanHabitRate: number
    mostCommonType: string | null
    mostFocusedArea: string | null
    mostFocusedObjective: string | null
  }
}

export default function EfficiencyMetricsComponent({ metrics }: EfficiencyMetricsComponentProps) {
  const { t } = useTranslation()
  const { meanHabitRate, mostCommonType, mostFocusedArea, mostFocusedObjective } = getEfficiencyMetricsData(metrics)

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
              <TrendingUp className='h-4 w-4 shrink-0' />
              {t('dashboard.efficiency_metrics.habit_rate')}
            </div>
            <div title={meanHabitRate} className='w-full truncate text-end text-xs font-semibold'>
              {meanHabitRate}
            </div>
          </div>
          <div className='flex flex-col items-start gap-2 rounded-md border p-2'>
            <div className='text-muted-foreground flex items-center gap-1.5 text-xs leading-tight font-medium'>
              <Bullseye className='h-4 w-4 shrink-0' />
              {t('dashboard.efficiency_metrics.task_type')}
            </div>
            <div title={mostCommonType} className='w-full truncate text-end text-xs font-semibold'>
              {mostCommonType}
            </div>
          </div>
          <div className='flex flex-col items-start gap-2 rounded-md border p-2'>
            <div className='text-muted-foreground flex items-center gap-1.5 text-xs leading-tight font-medium'>
              <SpeedFast className='h-4 w-4 shrink-0' />
              {t('dashboard.efficiency_metrics.focused_area')}
            </div>
            <div className='w-full truncate text-end text-xs font-semibold' title={mostFocusedArea}>
              {mostFocusedArea}
            </div>
          </div>
          <div className='flex flex-col items-start gap-2 rounded-md border p-2'>
            <div className='text-muted-foreground flex items-center gap-1.5 text-xs leading-tight font-medium'>
              <Search className='h-4 w-4 shrink-0' />
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
