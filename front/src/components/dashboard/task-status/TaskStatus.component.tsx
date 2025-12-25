import type { Task } from '@/types/models.types'
import { Zap } from '@nsmr/pixelart-react'
import { useMemo } from 'react'
import DashboardPieChartComponent from '../dashboard-pie-chart/DashboardPieChart.component'
import DashboardSectionWrapperComponent from '../dashboard-section-wrapper/DashboardSectionWrapper.component'
import { defaultTaskConfig } from './TaskStatus.config'
import { getTaskStatusStats } from './TaskStatus.utils'

interface TaskStatusComponentProps {
  tasks: Task[]
}

export default function TaskStatusComponent({ tasks }: TaskStatusComponentProps) {
  const taskStats = useMemo(() => getTaskStatusStats(tasks), [tasks])

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
        collectionLength={tasks?.length || 0}
        config={defaultTaskConfig}
        labelValue={tasks?.length?.toLocaleString() || '0'}
        chartLabel='dashboard.task_status.tasks'
        emptyLabel='dashboard.task_status.no_tasks'
      />
    </DashboardSectionWrapperComponent>
  )
}
