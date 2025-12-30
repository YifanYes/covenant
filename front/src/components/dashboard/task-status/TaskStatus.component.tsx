import { Zap } from '@nsmr/pixelart-react'
import { useMemo } from 'react'
import DashboardPieChartComponent from '../dashboard-pie-chart/DashboardPieChart.component'
import DashboardSectionWrapperComponent from '../dashboard-section-wrapper/DashboardSectionWrapper.component'
import { defaultTaskConfig } from './TaskStatus.config'
import { getTaskStatusStats } from './TaskStatus.utils'

interface TaskStatusComponentProps {
  stats: Record<string, number>
}

export default function TaskStatusComponent({ stats }: TaskStatusComponentProps) {
  const { taskStats, totalTasks } = useMemo(() => getTaskStatusStats(stats), [stats])

  return (
    <DashboardSectionWrapperComponent
      title='dashboard.task_status.title'
      icon={Zap}
      iconColorClass='text-yellow-500'
      contentClassName='px-0'
      className='gap-0'
    >
      <DashboardPieChartComponent
        data={taskStats}
        collectionLength={totalTasks}
        config={defaultTaskConfig}
        labelValue={totalTasks.toLocaleString()}
        chartLabel='dashboard.task_status.tasks'
        emptyLabel='dashboard.task_status.no_tasks'
      />
    </DashboardSectionWrapperComponent>
  )
}
