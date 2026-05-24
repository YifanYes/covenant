'use client'

import { useHabitCalendar } from '@/hooks/use-habit-calendar'
import { useHabitCompletion } from '@/hooks/use-habit-completion'
import type { Habit } from '@/types/models.types'
import Button from '@/ui/button.component'
import Tooltip, { TooltipContent, TooltipProvider, TooltipTrigger } from '@/ui/tooltip.component'
import { Check, Braces as Code, Loader } from 'pixelarticons/react'
import { forwardRef } from 'react'
import { useTranslation } from 'react-i18next'

// forwarding ref and event handlers so the trigger can attach to root div
const HabitCard = forwardRef<HTMLDivElement, { habit: Habit } & React.HTMLAttributes<HTMLDivElement>>(
  ({ habit, ...props }, ref) => {
    const { t } = useTranslation()
    const { name, description } = habit
    const { complete, isPending, periodCompletions, isPeriodCompleted, lastCompletedLabel, isNeglected, recurrence } =
      useHabitCompletion(habit)
    const calendarDays = useHabitCalendar(habit, 36)
    const progressLabel = t('habits.list.progress', { current: periodCompletions, target: recurrence })

    const handleMarkComplete = (e: React.MouseEvent) => {
      e.stopPropagation()
      complete()
    }

    return (
      <div
        ref={ref}
        {...props}
        className={`flex cursor-pointer flex-col rounded-lg border p-3 ${isNeglected ? 'border-amber-500/50' : ''}`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="bg-primary/10 text-primary rounded-md p-1.5">
              <Code className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <h3 className="max-w-full truncate text-base font-semibold">{name}</h3>
                  </TooltipTrigger>
                  <TooltipContent
                    arrow={false}
                    className="bg-background border-primary/50 text-card-foreground rounded-md border shadow-none"
                  >
                    <div className="flex max-w-50 flex-col gap-1">
                      <p className="font-semibold">{name}</p>
                      {description && <p className="text-muted-foreground text-xs">{description}</p>}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          <span className="text-muted-foreground text-xs tabular-nums">{progressLabel}</span>
          <Button
            size="icon"
            variant={isPeriodCompleted ? 'default' : 'outline'}
            onClick={handleMarkComplete}
            disabled={isPending || periodCompletions >= recurrence}
            className="h-8 w-8 shrink-0"
          >
            {isPending ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          </Button>
        </div>

        <p className={`mt-1 text-xs ${isNeglected ? 'text-amber-500' : 'text-muted-foreground'}`}>
          {lastCompletedLabel}
        </p>

        <div className="mt-4 flex flex-1 flex-col">
          <div className="grid flex-1 grid-cols-[repeat(9,1fr)] grid-rows-[repeat(4,1fr)] gap-1">
            {calendarDays.map(({ date, count, background, style }, index) => (
              <div
                key={index}
                className="relative aspect-square overflow-hidden rounded-sm"
                title={`${date}: ${count}`}
              >
                <div className={`absolute inset-0 ${background}`} style={style} />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }
)

HabitCard.displayName = 'HabitCard'

export default HabitCard
