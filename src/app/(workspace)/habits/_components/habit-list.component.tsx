'use client'
import { trpcOptions } from '@/utils/trpc.utils'
import { useSuspenseQuery } from '@tanstack/react-query'
import HabitRow from './habit-row.component'

export default function HabitList() {
  const { data } = useSuspenseQuery(trpcOptions.habits.getAll.queryOptions())
  const habits = data?.habits ?? []

  if (habits.length === 0) return null

  return (
    <div className="h-full overflow-y-auto">
      <div className="overflow-hidden rounded-md border">
        {habits.map((habit) => (
          <HabitRow key={habit.id} habit={habit} showTimespanBadge showLastCompleted />
        ))}
      </div>
    </div>
  )
}
