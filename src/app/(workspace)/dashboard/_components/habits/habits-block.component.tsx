'use client'
import { ListBox as Checklist } from 'pixelarticons/react'
import { useMemo } from 'react'
import DashboardPieChartComponent from '../dashboard-pie-chart/dashboard-pie-chart.component'
import DashboardSectionWrapperComponent from '../dashboard-section-wrapper.component'
import { defaultHabitConfig } from './habits-block.config'
import { getHabitStats } from './habits-block.utils'

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
      title="dashboard.habits.title"
      icon={Checklist}
      iconColorClass="text-lime-500"
      contentClassName="px-0"
      className="gap-0"
    >
      <DashboardPieChartComponent
        data={chartData}
        collectionLength={metrics?.completedToday}
        config={defaultHabitConfig}
        labelValue={completionRate}
        chartLabel="dashboard.habits.completion"
        emptyLabel="dashboard.habits.no_habits"
      />
    </DashboardSectionWrapperComponent>
  )
}
