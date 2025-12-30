import type { ChartConfig } from '@/components/ui/chart'

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
