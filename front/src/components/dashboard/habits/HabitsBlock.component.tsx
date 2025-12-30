import { Checklist } from '@nsmr/pixelart-react'
import { useMemo } from 'react'
import DashboardPieChartComponent from '../dashboard-pie-chart/DashboardPieChart.component'
import DashboardSectionWrapperComponent from '../dashboard-section-wrapper/DashboardSectionWrapper.component'
import { defaultHabitConfig } from './HabitsBlock.config'
import { getHabitStats } from './HabitsBlock.utils'

interface HabitsBlockComponentProps {
  metrics: {
    completedToday: number
    totalDaily: number
  }
}

export default function HabitsBlockComponent({ metrics }: HabitsBlockComponentProps) {
  const { chartData, completionRate } = useMemo(() => getHabitStats(metrics), [metrics])

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
        collectionLength={metrics?.completedToday}
        config={defaultHabitConfig}
        labelValue={completionRate}
        chartLabel='dashboard.habits.completion'
        emptyLabel='dashboard.habits.no_habits'
      />
    </DashboardSectionWrapperComponent>
  )
}
