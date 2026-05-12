'use client'
import { useDateFormat } from '@/hooks/use-date-format'
import type { Habit } from '@/types/models.types'
import Button from '@/ui/button.component'
import Tooltip, { TooltipContent, TooltipProvider, TooltipTrigger } from '@/ui/tooltip.component'
import { invalidators } from '@/utils/query-invalidation.utils'
import { getRewardText } from '@/utils/text.utils'
import { queryClient, trpcOptions } from '@/utils/trpc.utils'
import { Check, Braces as Code, Loader } from 'pixelarticons/react'
import { HabitTimespan } from '@shared/schemas/habits.schemas'
import { useMutation } from '@tanstack/react-query'
import type { OpUnitType } from 'dayjs'
import dayjs from 'dayjs'
import { forwardRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

const timespanUnits: Record<HabitTimespan, OpUnitType> = {
  [HabitTimespan.DAILY]: 'day',
  [HabitTimespan.WEEKLY]: 'week',
  [HabitTimespan.MONTHLY]: 'month'
}

// forwarding ref and event handlers so the trigger can attach to root div
const HabitCard = forwardRef<HTMLDivElement, { habit: Habit } & React.HTMLAttributes<HTMLDivElement>>(
  ({ habit: { completions = [], recurrence = 1, id, name, description, timespan }, ...props }, ref) => {
    const { t } = useTranslation()
    const { formatDate } = useDateFormat()
    const timespanUnit = timespanUnits[timespan as HabitTimespan]

    const createCompletion = useMutation(
      trpcOptions.habits.createCompletion.mutationOptions({
        onSuccess: async (data) => {
          const currentCount =
            completions.filter(({ completedAt }) => dayjs().isSame(completedAt, timespanUnit)).length + 1
          toast.success(
            t(currentCount >= recurrence ? 'habits.success.target_met' : 'habits.success.progress', {
              manaReward: getRewardText(data.manaEarned, data.reserveGained)
            })
          )
          await queryClient.invalidateQueries({ queryKey: trpcOptions.habits.getAll.queryKey() })
          await invalidators.character()
        },
        onError: () => toast.error(t('habits.error.complete'))
      })
    )

    // Generate calendar data for the last 36 days (5 weeks 1 day)
    const calendarDays = useMemo(() => {
      const completionCounts = new Map<string, number>()

      completions.forEach((completion) => {
        const dateStr = formatDate(completion?.completedAt)
        completionCounts.set(dateStr, (completionCounts.get(dateStr) || 0) + 1)
      })

      return Array.from({ length: 36 }).map((_, i) => {
        const date = dayjs().subtract(35 - i, 'day')
        const count = completionCounts.get(formatDate(date)) || 0
        return {
          date: formatDate(date),
          count,
          style: count > 0 ? { opacity: Math.max(0.3, Math.min(count / recurrence, 1)) } : {},
          background: date.isAfter(dayjs(), 'day') ? 'bg-muted/10' : count > 0 ? 'bg-primary' : 'bg-muted/30'
        }
      })
    }, [completions, recurrence, formatDate])

    const { periodCompletions, isPeriodCompleted } = useMemo(() => {
      const completionsInPeriod = completions.filter((c) => dayjs(c.completedAt).isSame(dayjs(), timespanUnit))
      return {
        periodCompletions: completionsInPeriod.length,
        isPeriodCompleted: completionsInPeriod.length >= recurrence
      }
    }, [completions, recurrence, timespanUnit])

    const handleMarkComplete = (e: React.MouseEvent) => {
      e.stopPropagation()
      createCompletion.mutate({ id })
    }

    return (
      <div ref={ref} {...props} className="flex cursor-pointer flex-col rounded-lg border p-3">
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
          <Button
            size="icon"
            variant={isPeriodCompleted ? 'default' : 'outline'}
            onClick={handleMarkComplete}
            disabled={createCompletion.isPending || periodCompletions >= recurrence}
            className="h-8 w-8 shrink-0"
          >
            {createCompletion.isPending ? (
              <Loader className="h-3.5 w-3.5 animate-spin" />
            ) : recurrence > 1 && periodCompletions + 1 < recurrence ? (
              <span className="text-xs font-bold">+1</span>
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>

        <div className="mt-4 flex flex-1 flex-col">
          <div className="grid flex-1 grid-cols-[repeat(9,1fr)] grid-rows-[repeat(4,1fr)] gap-1">
            {calendarDays.map(({ date, count, background, style }, index) => (
              <div
                key={index}
                className="relative flex aspect-square items-center justify-center overflow-hidden rounded-sm"
                title={`${date}: ${count}`}
              >
                <div className={`absolute inset-0 ${background}`} style={style} />
                {count > 1 && <span className="text-background relative z-10 text-xs font-bold">+{count}</span>}
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
