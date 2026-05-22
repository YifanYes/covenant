import { TASKS_VIEWS } from '@shared/schemas/auth.schemas'
import { z } from 'zod'

export const tasksSettingsSchema = z
  .object({
    defaultTasksView: z.enum(TASKS_VIEWS),
    showListTab: z.boolean(),
    showKanbanTab: z.boolean(),
    showTableTab: z.boolean(),
    showMatrixTab: z.boolean()
  })
  .refine((v) => v.showListTab || v.showKanbanTab || v.showTableTab || v.showMatrixTab, {
    message: 'tasks.settings.at_least_one_visible',
    path: ['showListTab']
  })

export type TasksSettingsFormValues = z.infer<typeof tasksSettingsSchema>
