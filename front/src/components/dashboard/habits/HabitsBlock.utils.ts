import type { Habit } from '@/types/models.types'
import dayjs from 'dayjs'
import { defaultHabitConfig } from './HabitsBlock.config'

export const getHabitStats = (habits: Habit[]) => {
  const dailyHabits = habits?.filter((habit) => habit.timespan === 'DAILY') || []

  if (dailyHabits.length === 0) {
    return { completionRate: 0, chartData: [] }
  }

  const today = dayjs().startOf('day')
  let completedToday = 0

  dailyHabits.forEach((habit) => {
    const completions = habit.completions || []
    const todayCount = completions.filter((c: any) => dayjs(c.completedAt).isSame(today, 'day')).length
    const metToday = todayCount >= habit.recurrence
    if (metToday) completedToday++
  })

  const remaining = dailyHabits.length - completedToday
  const completionRate = Math.round((completedToday / dailyHabits.length) * 100)

  return {
    completionRate,
    chartData: [
      { name: defaultHabitConfig.completed.label, data: completedToday, fill: 'var(--chart-2)' },
      { name: defaultHabitConfig.remaining.label, data: remaining, fill: 'var(--muted-foreground)' }
    ]
  }
}
