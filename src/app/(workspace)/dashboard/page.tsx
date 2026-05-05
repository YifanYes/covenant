'use client'
import { useAuthStore } from '@/stores/auth.store'
import { trpcOptions } from '@/utils/trpc.utils'
import { Calendar } from 'pixelarticons/react'
import { useSuspenseQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { startCase } from 'es-toolkit/compat'
import { useTranslation } from 'react-i18next'
import AreasDistribution from './_components/areas-distribution/areas-distribution.component'
import Blindspot from './_components/blindspot/blindspot.component'
import EfficiencyMetrics from './_components/efficiency-metrics-component/efficiency-metrics.component'
import HabitsBlock from './_components/habits/habits-block.component'
import TaskStatusWidget from './_components/task-status/task-status.component'
import UpcomingTasks from './_components/upcoming-tasks/upcoming-tasks.component'

export default function Dashboard() {
  const { t } = useTranslation()
  const { email } = useAuthStore()
  const { data: dashboardData } = useSuspenseQuery(trpcOptions.dashboard.get.queryOptions())

  const name = dashboardData.characterName || startCase(email ? email.split('@')[0] : '')
  const date = dayjs().format('L')

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{t('dashboard.title', { name })}</h1>
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4" />
          <span>{date}</span>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <UpcomingTasks tasks={dashboardData.upcomingTasks} />
        <EfficiencyMetrics metrics={dashboardData.efficiencyMetrics} />
        <TaskStatusWidget stats={dashboardData.statusStats} />
        <AreasDistribution areas={dashboardData.taskMetrics.areas} />
        <HabitsBlock metrics={dashboardData.habitsMetrics} />
        <Blindspot {...dashboardData.taskMetrics} />
      </div>
    </div>
  )
}
