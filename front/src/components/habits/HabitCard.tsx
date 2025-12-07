import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { Habit } from '@/types/models.types'
import { queryClient, trpc } from '@/utils/trpc.utils'
import { Check, Code, Loader } from '@nsmr/pixelart-react'
import { useMutation } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { forwardRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

const HabitCard = forwardRef<HTMLDivElement, { habit: Habit } & React.HTMLAttributes<HTMLDivElement>>(
  ({ habit: { completions = [], recurrence = 1, id, name, description }, ...props }, ref) => {
    const { t } = useTranslation()

    const createCompletion = useMutation(
      trpc.habits.createCompletion.mutationOptions({
        onSuccess: async () => {
          const currentCount = completions.filter(({ completedAt }) => dayjs().isSame(completedAt, 'day')).length + 1
          toast.success(t(currentCount >= recurrence ? 'habits.success.target_met' : 'habits.success.progress'))
          await queryClient.invalidateQueries({ queryKey: trpc.habits.getAll.queryKey() })
        },
        onError: () => toast.error(t('habits.error.complete'))
      })
    )

    const calendarDays = useMemo(() => {
      const days = []
      const completionCounts = new Map<string, number>()

      completions.forEach((c) => {
        const dateStr = dayjs(c.completedAt).format('L')
        completionCounts.set(dateStr, (completionCounts.get(dateStr) || 0) + 1)
      })

      for (let i = 35; i >= 0; i--) {
        const date = dayjs().subtract(i, 'day')
        const count = completionCounts.get(date.format('L')) || 0
        const isFuture = date.isAfter(dayjs())
        days.push({ date, count, isFuture })
      }

      return days
    }, [completions])

    const handleMarkComplete = (e: React.MouseEvent) => {
      e.stopPropagation()
      createCompletion.mutate({ id })
    }

    const { completionsToday, isTodayCompleted } = useMemo(() => {
      const todayCompletions = completions.filter((c) => dayjs(c.completedAt).isSame(dayjs(), 'day'))
      return { completionsToday: todayCompletions.length, isTodayCompleted: todayCompletions.length >= recurrence }
    }, [completions, recurrence])

    return (
      <div ref={ref} {...props} className='cursor-pointer rounded-lg border p-3'>
        <div className='flex items-center justify-between gap-3'>
          <div className='flex flex-1 items-center gap-2'>
            <div className='bg-primary/10 text-primary rounded-md p-1.5'>
              <Code className='h-4 w-4' />
            </div>
            <div className='min-w-0 flex-1'>
              <div className='flex items-center gap-3'>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <h3 className='truncate text-base font-semibold'>{name}</h3>
                    </TooltipTrigger>
                    <TooltipContent
                      arrow={false}
                      className='bg-background border-primary/50 text-card-foreground rounded-md border shadow-none'
                    >
                      <div className='flex max-w-[200px] flex-col gap-1'>
                        <p className='font-semibold'>{name}</p>
                        {description && <p className='text-muted-foreground text-xs'>{description}</p>}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>
          <Button
            size='icon'
            variant={isTodayCompleted ? 'default' : 'outline'}
            onClick={handleMarkComplete}
            disabled={createCompletion.isPending || completionsToday >= recurrence}
            className='h-8 w-8 shrink-0'
          >
            {createCompletion.isPending ? (
              <Loader className='h-3.5 w-3.5 animate-spin' />
            ) : recurrence > 1 && completionsToday + 1 < recurrence ? (
              <span className='text-xs font-bold'>+1</span>
            ) : (
              <Check className='h-3.5 w-3.5' />
            )}
          </Button>
        </div>

        <div className='mt-4'>
          <div className='grid grid-cols-9 gap-1'>
            {calendarDays.map((day, index) => {
              const ratio = Math.min(day.count / recurrence, 1)
              const opacity = day.count > 0 ? Math.max(0.3, ratio) : 0

              let bgStyle = {}
              let className = 'bg-muted/30'

              if (day.isFuture) {
                className = 'bg-muted/10'
              } else if (day.count > 0) {
                className = 'bg-primary'
                bgStyle = { opacity }
              }

              return (
                <div
                  key={index}
                  className='relative flex aspect-square items-center justify-center overflow-hidden rounded-sm'
                  title={`${day.date.format('L')}: ${day.count}`}
                >
                  <div className={`absolute inset-0 ${className}`} style={bgStyle} />
                  {day.count > 1 && (
                    <span className='text-background relative z-10 text-xs font-bold'>+{day.count}</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }
)

HabitCard.displayName = 'HabitCard'

export default HabitCard
