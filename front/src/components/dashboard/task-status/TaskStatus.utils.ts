import type { Task } from '@/types/models.types'
import { TaskStatus } from '@shared/schemas/tasks.schemas'
import dayjs from 'dayjs'
import { defaultTaskConfig } from './TaskStatus.config'

export const getTaskStatusStats = (tasks: Task[]) => {
  const counts = {
    TODO: 0,
    DOING: 0,
    DONE: 0,
    OVERDUE: 0
  }

  tasks.forEach((task) => {
    if (task.dueDate && dayjs(task.dueDate).isBefore(dayjs()) && task.status !== TaskStatus.DONE) {
      counts.OVERDUE++
    } else if (task.status in counts) {
      counts[task.status as keyof typeof counts]++
    }
  })

  return [
    { name: defaultTaskConfig.TODO.label, data: counts.TODO, fill: defaultTaskConfig.TODO.color },
    { name: defaultTaskConfig.DOING.label, data: counts.DOING, fill: defaultTaskConfig.DOING.color },
    { name: defaultTaskConfig.DONE.label, data: counts.DONE, fill: defaultTaskConfig.DONE.color },
    { name: defaultTaskConfig.OVERDUE.label, data: counts.OVERDUE, fill: defaultTaskConfig.OVERDUE.color }
  ].filter((item) => item.data > 0)
}
