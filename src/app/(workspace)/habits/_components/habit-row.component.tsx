'use client'
import { useHabitCompletion } from '@/hooks/use-habit-completion'
import { cn } from '@/lib/cn.lib'
import type { Habit } from '@/types/models.types'
import Button from '@/ui/button.component'
import { Check, Loader } from 'pixelarticons/react'
import { useTranslation } from 'react-i18next'
import UpdateHabitDialog from './update-habit-dialog.component'

type HabitRowProps = {
  habit: Habit
  showTimespanBadge?: boolean
  showLastCompleted?: boolean
}

export default function HabitRow({ habit, showTimespanBadge = false, showLastCompleted = false }: HabitRowProps) {
  const { t } = useTranslation()
  const {
    complete,
    isPending,
    periodCompletions,
    isPeriodCompleted,
    lastCompletedLabel,
    isNeglected,
    recurrence
  } = useHabitCompletion(habit)

  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation()
    complete()
  }

  const timespanKey = habit.timespan?.toLowerCase()
  const progressLabel = t('habits.list.progress', { current: periodCompletions, target: recurrence })

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      e.currentTarget.click()
    }
  }

  const trigger = (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={cn(
        'group hover:bg-accent/40 flex w-full cursor-pointer items-center gap-3 border-b px-4 py-3 last:border-b-0',
        isNeglected && 'border-l-2 border-l-amber-500/50'
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{habit.name}</span>
          {showTimespanBadge && timespanKey && (
            <span className="text-muted-foreground bg-muted/50 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide">
              {t(`habits.timespan.${timespanKey}` as Parameters<typeof t>[0], { defaultValue: timespanKey })}
            </span>
          )}
        </div>
        {showLastCompleted && (
          <p className={cn('mt-0.5 truncate text-xs', isNeglected ? 'text-amber-500' : 'text-muted-foreground')}>
            {lastCompletedLabel}
          </p>
        )}
      </div>
      <span className="text-muted-foreground text-xs tabular-nums">{progressLabel}</span>
      <Button
        size="icon"
        variant={isPeriodCompleted ? 'default' : 'outline'}
        onClick={handleComplete}
        disabled={isPending || periodCompletions >= recurrence}
        className="h-7 w-7 shrink-0"
      >
        {isPending ? <Loader className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
      </Button>
    </div>
  )

  return <UpdateHabitDialog habit={habit} trigger={trigger} />
}
