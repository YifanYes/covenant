import { AreasDistributionCard } from '@/components/dashboard/AreasDistributionCard'
import { BlindspotComponent } from '@/components/dashboard/blindspot/Blindspot.component'
import { CompletionMetricsCard } from '@/components/dashboard/CompletionMetricsCard'
import { HabitsCard } from '@/components/dashboard/HabitsCard'
import { TaskStatusComponent } from '@/components/dashboard/task-status/TaskStatus.component'
import { UpcomingTasksComponent } from '@/components/dashboard/upcoming-tasks/UpcomingTasks.component'
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
  const name = startCase(email ? email.split('@')[0] : '')
  const date = dayjs().format('L')

  const { data: habitsData } = useSuspenseQuery(trpc.habits.getAll.queryOptions())
  const { data: tasksData } = useSuspenseQuery(trpc.tasks.getAll.queryOptions())
  const { data: areasData } = useSuspenseQuery(trpc.areas.getAll.queryOptions())

  const allTasks = tasksData?.tasks ? Object.values(tasksData.tasks).flat() : []
  const allHabits = habitsData?.habits || []
  const allAreas = areasData?.areas || []

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
        <UpcomingTasksComponent tasks={allTasks} />
        <TaskStatusComponent tasks={allTasks} />
        <BlindspotComponent areas={allAreas} tasks={allTasks} />
      </div>
    </div>
  )
}
