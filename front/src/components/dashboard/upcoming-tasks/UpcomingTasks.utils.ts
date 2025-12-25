import type { Task } from '@/types/models.types'
import { TaskStatus } from '@shared/schemas/tasks.schemas'
import dayjs from 'dayjs'

export const getUpcomingTasks = (tasks: Task[]) =>
  tasks.filter(
    (task) =>
      task.status !== TaskStatus.DONE &&
      task.dueDate &&
      (dayjs(task.dueDate) <= dayjs().add(1, 'day') || dayjs(task.dueDate) < dayjs().startOf('day'))
  )
