'use client'

import { useDateFormat } from '@/hooks/use-date-format'
import { getCellOpacity } from '@/hooks/use-habit-calendar'
import { useHabitCompletion } from '@/hooks/use-habit-completion'
import { cn } from '@/lib/cn.lib'
import type { Habit } from '@/types/models.types'
import Button from '@/ui/button.component'
import Tooltip, { TooltipContent, TooltipProvider, TooltipTrigger } from '@/ui/tooltip.component'
import { trpcOptions } from '@/utils/trpc.utils'
import { useSuspenseQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { Check, Loader } from 'pixelarticons/react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

const WEEKS = 52
const DAYS_PER_WEEK = 7

type Cell = {
  date: string
  count: number
  isFuture: boolean
}

function useAnnualGrid(habit: Habit): Cell[][] {
  const { formatDate } = useDateFormat()
  return useMemo(() => {
    const counts = new Map<string, number>()
    for (const c of habit.completions ?? []) {
      const key = formatDate(c.completedAt)
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    const today = dayjs()
    const gridStart = today.startOf('week').subtract(WEEKS - 1, 'week')
    const grid: Cell[][] = []
    for (let col = 0; col < WEEKS; col++) {
      const week: Cell[] = []
      for (let row = 0; row < DAYS_PER_WEEK; row++) {
        const date = gridStart.add(col * DAYS_PER_WEEK + row, 'day')
        const key = formatDate(date)
        week.push({
          date: key,
          count: counts.get(key) ?? 0,
          isFuture: date.isAfter(today, 'day')
        })
      }
      grid.push(week)
    }
    return grid
  }, [habit.completions, formatDate])
}

function HabitHeatmapCard({ habit }: { habit: Habit }) {
  const { t } = useTranslation()
  const grid = useAnnualGrid(habit)
  const { complete, isPending, periodCompletions, isPeriodCompleted, recurrence } = useHabitCompletion(habit)
  const timespanKey = habit.timespan?.toLowerCase()

  const totalThisYear = useMemo(() => {
    const since = dayjs()
      .startOf('week')
      .subtract(WEEKS - 1, 'week')
    return (habit.completions ?? []).filter((c) => !dayjs(c.completedAt).isBefore(since)).length
  }, [habit.completions])

  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation()
    complete()
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-semibold">{habit.name}</h3>
            {timespanKey && (
              <span className="text-muted-foreground bg-muted/50 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                {t(`habits.timespan.${timespanKey}` as Parameters<typeof t>[0], { defaultValue: timespanKey })}
              </span>
            )}
          </div>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {t('habits.heatmap.total_year', { count: totalThisYear })}
          </p>
        </div>
        <span className="text-muted-foreground text-xs tabular-nums">
          {t('habits.list.progress', { current: periodCompletions, target: recurrence })}
        </span>
        <Button
          size="icon"
          variant={isPeriodCompleted ? 'default' : 'outline'}
          onClick={handleComplete}
          disabled={isPending || periodCompletions >= recurrence}
          className="h-8 w-8 shrink-0"
        >
          {isPending ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
        </Button>
      </div>

      <TooltipProvider>
        <div
          className="grid gap-1 overflow-x-auto"
          style={{ gridTemplateColumns: `repeat(${WEEKS}, minmax(0.5rem, 1fr))` }}
        >
          {grid.map((week, ci) => (
            <div key={ci} className="grid grid-rows-7 gap-1">
              {week.map((cell, ri) => {
                const opacity = getCellOpacity(cell.count)
                const background = cell.isFuture ? 'bg-muted/10' : cell.count > 0 ? 'bg-primary' : 'bg-muted/30'
                return (
                  <Tooltip key={ri}>
                    <TooltipTrigger asChild>
                      <div className="relative aspect-square overflow-hidden rounded-[2px]">
                        <div className={cn('absolute inset-0', background)} style={cell.count > 0 ? { opacity } : {}} />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <span className="text-xs">
                        {cell.date}: {cell.count}
                      </span>
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </div>
          ))}
        </div>
      </TooltipProvider>
    </div>
  )
}

export default function HabitHeatmap() {
  const { data } = useSuspenseQuery(trpcOptions.habits.getAll.queryOptions())
  const habits = data?.habits ?? []
  if (habits.length === 0) return null
  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto pb-4">
      {habits.map((habit) => (
        <HabitHeatmapCard key={habit.id} habit={habit} />
      ))}
    </div>
  )
}
