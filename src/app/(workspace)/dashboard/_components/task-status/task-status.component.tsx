'use client'
import { Zap } from 'pixelarticons/react'
import { useMemo } from 'react'
import DashboardPieChartComponent from '../dashboard-pie-chart/dashboard-pie-chart.component'
import DashboardSectionWrapperComponent from '../dashboard-section-wrapper.component'
import { defaultTaskConfig } from './task-status.config'
import { getTaskStatusStats } from './task-status.utils'

interface TaskStatusComponentProps {
  stats: Record<string, number>
}

export default function TaskStatusComponent({ stats }: TaskStatusComponentProps) {
  const { taskStats, totalTasks } = useMemo(() => getTaskStatusStats(stats), [stats])

  return (
    <DashboardSectionWrapperComponent
      title="dashboard.task_status.title"
      icon={Zap}
      iconColorClass="text-yellow-500"
      contentClassName="px-0"
      className="gap-0"
    >
      <DashboardPieChartComponent
        data={taskStats}
        collectionLength={totalTasks}
        config={defaultTaskConfig}
        labelValue={totalTasks.toLocaleString()}
        chartLabel="dashboard.task_status.tasks"
        emptyLabel="dashboard.task_status.no_tasks"
      />
    </DashboardSectionWrapperComponent>
  )
}
