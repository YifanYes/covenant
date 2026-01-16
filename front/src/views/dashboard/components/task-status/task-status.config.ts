import type { ChartConfig } from '@/ui/chart.component'

export const defaultTaskConfig = {
  TODO: {
    label: 'dashboard.task_status.TODO',
    color: 'var(--muted-foreground)'
  },
  DOING: {
    label: 'dashboard.task_status.DOING',
    color: 'var(--chart-4)'
  },
  DONE: {
    label: 'dashboard.task_status.DONE',
    color: 'var(--chart-2)'
  },
  OVERDUE: {
    label: 'dashboard.task_status.OVERDUE',
    color: 'var(--chart-1)'
  }
} satisfies ChartConfig
