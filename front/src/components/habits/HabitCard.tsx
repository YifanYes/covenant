import type { Habit } from '@/types/models.types'
import { useTranslation } from 'react-i18next'

export default function HabitCard({ habit }: { habit: Habit }) {
  const { t } = useTranslation()

  return (
    <div key={habit.id} className='hover:bg-accent cursor-pointer rounded-lg border p-4 transition-colors'>
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
