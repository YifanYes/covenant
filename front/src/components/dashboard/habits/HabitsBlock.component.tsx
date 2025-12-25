import type { Habit } from '@/types/models.types'
import { Checklist } from '@nsmr/pixelart-react'
import { useMemo } from 'react'
import DashboardPieChartComponent from '../dashboard-pie-chart/DashboardPieChart.component'
import DashboardSectionWrapperComponent from '../dashboard-section-wrapper/DashboardSectionWrapper.component'
import { defaultHabitConfig } from './HabitsBlock.config'
import { getHabitStats } from './HabitsBlock.utils'

interface HabitsBlockComponentProps {
  habits: Habit[]
}

export default function HabitsBlockComponent({ habits }: HabitsBlockComponentProps) {
  const { chartData, completionRate } = useMemo(() => getHabitStats(habits), [habits])

  return (
    <DashboardSectionWrapperComponent
      title='sidebar.habits'
      icon={Checklist}
      iconColorClass='text-lime-500'
      contentClassName='px-0'
      className='gap-0'
    >
      <DashboardPieChartComponent
        data={chartData}
        collectionLength={chartData?.length || 0}
        config={defaultHabitConfig}
        labelValue={`${completionRate?.toLocaleString()}%`}
        chartLabel='dashboard.habits.completion'
        emptyLabel='dashboard.habits.no_habits'
      />
    </DashboardSectionWrapperComponent>
  )
}
