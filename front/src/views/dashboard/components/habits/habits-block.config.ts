import type { ChartConfig } from '@/ui/chart.component'

export const defaultHabitConfig = {
  completed: {
    label: 'dashboard.habits.completed',
    color: 'var(--chart-2)'
  },
  remaining: {
    label: 'dashboard.habits.remaining',
    color: 'var(--muted-foreground)'
  }
} satisfies ChartConfig
