import { TaskEffort, TaskImpact } from '@shared/schemas/tasks.schemas'

export const taskPriorityTypes: Record<string, Record<string, string>> = {
  [TaskImpact.HIGH]: {
    [TaskEffort.LOW]: 'tasks.task_types.quick_win',
    [TaskEffort.HIGH]: 'tasks.task_types.major_project'
  },
  [TaskImpact.LOW]: {
    [TaskEffort.LOW]: 'tasks.task_types.fill_in',
    [TaskEffort.HIGH]: 'tasks.task_types.thankless_task'
  }
}
