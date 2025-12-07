import { Button } from '@/components/ui/button'
import type { Habit } from '@/types/models.types'
import { queryClient, trpc } from '@/utils/trpc.utils'
import { Check, Code } from '@nsmr/pixelart-react'
import { useMutation } from '@tanstack/react-query'
import { forwardRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

// forwarding ref and event handlers so the trigger can attach to root div
const HabitCard = forwardRef<HTMLDivElement, { habit: Habit } & React.HTMLAttributes<HTMLDivElement>>(
  ({ habit, ...props }, ref) => {
    const { t } = useTranslation()

    const createCompletion = useMutation(
      trpc.habits.createCompletion.mutationOptions({
        onSuccess: async () => {
          toast.success(t('habits.success.complete'))
          await queryClient.invalidateQueries({ queryKey: trpc.habits.getAll.queryKey() })
        },
        onError: () => {
          toast.error(t('habits.error.complete'))
        }
      })
    )

    // Generate calendar data for the last 16 weeks (112 days)
    const calendarDays = useMemo(() => {
      const days = []
      const today = new Date()

      // Create a set of completion dates for quick lookup
      const completionDates = new Set(
        (habit.completions || []).map((c) => {
          const date = new Date(c.completedAt)
          return date.toDateString()
        })
      )

      // Generate last 112 days (16 weeks)
      for (let i = 111; i >= 0; i--) {
        const date = new Date(today)
        date.setDate(date.getDate() - i)

        const isCompleted = completionDates.has(date.toDateString())
        const isFuture = date > today

        days.push({
          date,
          isCompleted,
          isFuture
        })
      }

      return days
    }, [habit.completions])

    const handleMarkComplete = (e: React.MouseEvent) => {
      e.stopPropagation()
      createCompletion.mutate({ id: habit.id })
    }

    const isTodayCompleted = useMemo(() => {
      const today = new Date().toDateString()
      return (habit.completions || []).some((c) => {
        const completionDate = new Date(c.completedAt).toDateString()
        return completionDate === today
      })
    }, [habit.completions])

    return (
      <div ref={ref} {...props} className='cursor-pointer rounded-lg border p-4'>
        <div className='flex items-start justify-between gap-3'>
          <div className='flex flex-1 items-start gap-2'>
            <div className='bg-primary/10 text-primary rounded-md p-1.5'>
              <Code className='h-4 w-4' />
            </div>
            <div className='flex-1'>
              <h3 className='text-base font-semibold'>{habit.name}</h3>
              {habit.description && <p className='text-muted-foreground mt-0.5 text-xs'>{habit.description}</p>}
            </div>
          </div>
          <Button
            size='icon'
            variant={isTodayCompleted ? 'default' : 'outline'}
            onClick={handleMarkComplete}
            disabled={createCompletion.isPending}
            className='h-8 w-8 shrink-0'
          >
            <Check className='h-3.5 w-3.5' />
          </Button>
        </div>

        <div className='mt-4'>
          <div className='grid grid-cols-28 gap-[2px]'>
            {calendarDays.map((day, index) => {
              let colorClass = 'bg-muted/30' // Default for incomplete/not yet

              if (day.isFuture) {
                colorClass = 'bg-muted/10'
              } else if (day.isCompleted) {
                // Vary the color intensity based on how recent the completion is
                const intensity = Math.floor((index / calendarDays.length) * 5)
                const colors = [
                  'bg-emerald-400/40',
                  'bg-emerald-500/50',
                  'bg-emerald-600/60',
                  'bg-emerald-700/70',
                  'bg-emerald-800/80'
                ]
                colorClass = colors[intensity] || 'bg-emerald-500/50'
              }

              return (
                <div
                  key={index}
                  className={`aspect-square rounded-sm ${colorClass}`}
                  title={day.date.toLocaleDateString()}
                />
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
