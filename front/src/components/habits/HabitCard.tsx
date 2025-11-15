import type { Habit } from '@/types/models.types'
import { forwardRef } from 'react'
import { useTranslation } from 'react-i18next'

// forwarding ref and event handlers so the trigger can attach to root div
const HabitCard = forwardRef<HTMLDivElement, { habit: Habit } & React.HTMLAttributes<HTMLDivElement>>(
  ({ habit, ...props }, ref) => {
    const { t } = useTranslation()

    return (
      <div ref={ref} className='hover:bg-accent cursor-pointer rounded-lg border p-4 transition-colors' {...props}>
        <h2 className='text-lg font-semibold'>{habit.name}</h2>
        {habit.description && <p className='text-muted-foreground mt-1'>{habit.description}</p>}
        <div className='text-muted-foreground mt-2 flex gap-2 text-sm'>
          <span>
            {habit.recurrence} {t(`habits.timespan.${habit.timespan.toLowerCase()}`)}
          </span>
        </div>
      </div>
    )
  }
)

// Add displayName for React Dev Tools
HabitCard.displayName = 'HabitCard'

export default HabitCard
