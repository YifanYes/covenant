'use client'
import Button from '@/ui/button.component'
import { invalidators } from '@/utils/query-invalidation.utils'
import { trpcOptions } from '@/utils/trpc.utils'
import type { IncompleteHabit } from '@shared/types/dashboard.types'
import { useMutation } from '@tanstack/react-query'
import { Check, ListBox as Checklist, Loader } from 'pixelarticons/react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import DashboardPieChartComponent from '../dashboard-pie-chart/dashboard-pie-chart.component'
import DashboardSectionWrapperComponent from '../dashboard-section-wrapper.component'
import { defaultHabitConfig } from './habits-block.config'
import { getHabitStats } from './habits-block.utils'

interface HabitsBlockComponentProps {
  metrics: {
    completedToday: number
    totalDaily: number
    incompleteDaily: IncompleteHabit[]
  }
}

function IncompleteHabitRow({ habit }: { habit: IncompleteHabit }) {
  const { t } = useTranslation()
  const complete = useMutation(
    trpcOptions.habits.createCompletion.mutationOptions({
      onSuccess: async () => {
        toast.success(t('dashboard.habits.completion_success'))
        await invalidators.habits()
      },
      onError: () => toast.error(t('habits.error.internal.complete'))
    })
  )

  const remaining = habit.recurrence - habit.completedToday
  const showProgress = habit.recurrence > 1

  return (
    <div className="bg-card/30 flex items-center gap-2 rounded-md border px-3 py-2">
      <span className="text-foreground flex-1 truncate text-sm">{habit.name}</span>
      {showProgress && (
        <span className="text-muted-foreground shrink-0 font-mono text-xs">
          {habit.completedToday}/{habit.recurrence}
        </span>
      )}
      <Button
        size="icon"
        variant="outline"
        onClick={() => complete.mutate({ id: habit.id })}
        disabled={complete.isPending}
        className="h-7 w-7 shrink-0"
        title={t('dashboard.habits.quick_complete')}
      >
        {complete.isPending ? (
          <Loader className="h-3 w-3 animate-spin" />
        ) : showProgress && remaining > 1 ? (
          <span className="text-[10px] font-bold">+1</span>
        ) : (
          <Check className="h-3 w-3" />
        )}
      </Button>
    </div>
  )
}

export default function HabitsBlockComponent({ metrics }: HabitsBlockComponentProps) {
  const { t } = useTranslation()
  const { chartData, completionRate } = useMemo(() => getHabitStats(metrics), [metrics])
  const incomplete = metrics.incompleteDaily ?? []

  return (
    <DashboardSectionWrapperComponent
      title="dashboard.habits.title"
      icon={Checklist}
      iconColorClass="text-lime-500"
      contentClassName="px-0"
      className="gap-0 lg:col-span-2"
    >
      <div className="flex h-full flex-col gap-3 sm:flex-row">
        <div className="flex w-full shrink-0 items-center sm:w-1/3">
          <DashboardPieChartComponent
            data={chartData}
            collectionLength={metrics?.completedToday}
            config={defaultHabitConfig}
            labelValue={completionRate}
            chartLabel="dashboard.habits.completion"
            emptyLabel="dashboard.habits.no_habits"
          />
        </div>
        <div className="flex flex-1 flex-col px-6 sm:px-3">
          {metrics.totalDaily === 0 ? null : incomplete.length === 0 ? (
            <div className="text-muted-foreground flex h-full items-center justify-center text-center text-sm">
              {t('dashboard.habits.all_done')}
            </div>
          ) : (
            <div className="scrollbar-thin scrollbar-thumb-muted max-h-44 space-y-2 overflow-y-auto pr-2">
              {incomplete.map((habit) => (
                <IncompleteHabitRow key={habit.id} habit={habit} />
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardSectionWrapperComponent>
  )
}
