'use client'
import { useDateFormat } from '@/hooks/use-date-format'
import { useAuthStore } from '@/stores/auth.store'
import { trpcOptions } from '@/utils/trpc.utils'
import { Calendar } from 'pixelarticons/react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { startCase } from 'es-toolkit/compat'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import AreasDistribution from './_components/areas-distribution/areas-distribution.component'
import Blindspot from './_components/blindspot/blindspot.component'
import EfficiencyMetrics from './_components/efficiency-metrics-component/efficiency-metrics.component'
import HabitsBlock from './_components/habits/habits-block.component'
import TaskStatusWidget from './_components/task-status/task-status.component'
import Trend from './_components/trend/trend.component'
import UpcomingTasks from './_components/upcoming-tasks/upcoming-tasks.component'

export default function Dashboard() {
  const { t } = useTranslation()
  const { email } = useAuthStore()
  const timezoneOffset = useMemo(() => new Date().getTimezoneOffset(), [])
  const { data: dashboardData } = useSuspenseQuery(trpcOptions.dashboard.get.queryOptions({ timezoneOffset }))
  const { formatDate } = useDateFormat()

  const name = dashboardData.characterName || startCase(email ? email.split('@')[0] : '')
  const date = formatDate(new Date())
  const { dueSoonCount, neglectedCount } = dashboardData.summary
  const { completedToday, totalDaily } = dashboardData.habitsMetrics

  const summaryParts = [
    dueSoonCount > 0 ? t('dashboard.summary.due_soon', { count: dueSoonCount }) : null,
    totalDaily > 0 ? t('dashboard.summary.habits_done', { done: completedToday, total: totalDaily }) : null,
    neglectedCount > 0 ? t('dashboard.summary.neglected', { count: neglectedCount }) : null
  ].filter((part): part is string => part !== null)

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">{t('dashboard.title', { name })}</h1>
          {summaryParts.length > 0 && <p className="text-muted-foreground text-sm">{summaryParts.join(' · ')}</p>}
        </div>
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4" />
          <span>{date}</span>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <UpcomingTasks tasks={dashboardData.upcomingTasks} />
        <EfficiencyMetrics metrics={dashboardData.efficiencyMetrics} />
        <TaskStatusWidget stats={dashboardData.statusStats} />
        <HabitsBlock metrics={dashboardData.habitsMetrics} />
        <Trend trend={dashboardData.completionsTrend} />
        <AreasDistribution areas={dashboardData.taskMetrics.areas} />
        <Blindspot {...dashboardData.taskMetrics} />
      </div>
    </div>
  )
}
