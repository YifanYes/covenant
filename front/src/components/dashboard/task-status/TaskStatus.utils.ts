import { defaultTaskConfig } from './TaskStatus.config'

export const getTaskStatusStats = (stats: Record<string, number>) => ({
  taskStats: [
    { name: defaultTaskConfig.TODO.label, data: stats.TODO || 0, fill: defaultTaskConfig.TODO.color },
    { name: defaultTaskConfig.DOING.label, data: stats.DOING || 0, fill: defaultTaskConfig.DOING.color },
    { name: defaultTaskConfig.DONE.label, data: stats.DONE || 0, fill: defaultTaskConfig.DONE.color },
    { name: defaultTaskConfig.OVERDUE.label, data: stats.OVERDUE || 0, fill: defaultTaskConfig.OVERDUE.color }
  ].filter((item) => item.data > 0),
  totalTasks: (stats.TODO || 0) + (stats.DOING || 0) + (stats.DONE || 0) + (stats.OVERDUE || 0)
})
