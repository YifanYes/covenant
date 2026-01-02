import AreasDistributionComponent from '@/components/dashboard/areas-distribution/AreasDistribution.component'
import BlindspotComponent from '@/components/dashboard/blindspot/Blindspot.component'
import EfficiencyMetricsComponent from '@/components/dashboard/efficiency-metrics-component/EfficiencyMetrics.component'
import HabitsBlockComponent from '@/components/dashboard/habits/HabitsBlock.component'
import TaskStatusComponent from '@/components/dashboard/task-status/TaskStatus.component'
import UpcomingTasksComponent from '@/components/dashboard/upcoming-tasks/UpcomingTasks.component'
import { useAuthStore } from '@/hooks/use-auth-store'
import { trpc } from '@/utils/trpc.utils'
import { useSuspenseQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { startCase } from 'es-toolkit/compat'
import { Calendar } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function Dashboard() {
  const { t } = useTranslation()
  const { email } = useAuthStore()
  const { data: dashboardData } = useSuspenseQuery(trpc.dashboard.get.queryOptions())

  const name = dashboardData.characterName || startCase(email ? email.split('@')[0] : '')
  const date = dayjs().format('L')

  return (
    <div className='flex flex-col gap-6 p-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-3xl font-bold tracking-tight'>{t('dashboard.title', { name })}</h1>
        <div className='text-muted-foreground flex items-center gap-2 text-sm'>
          <Calendar className='h-4 w-4' />
          <span>{date}</span>
        </div>
      </div>
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <UpcomingTasksComponent tasks={dashboardData.upcomingTasks} />
        <EfficiencyMetricsComponent metrics={dashboardData.efficiencyMetrics} />
        <TaskStatusComponent stats={dashboardData.statusStats} />
        <AreasDistributionComponent areas={dashboardData.taskMetrics.areas} />
        <HabitsBlockComponent metrics={dashboardData.habitsMetrics} />
        <BlindspotComponent {...dashboardData.taskMetrics} />
      </div>
    </div>
  )
}
