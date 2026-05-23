import { TASKS_VIEWS } from '@shared/schemas/auth.schemas'
import { PROTECTED_LABELS } from '@shared/schemas/user-task-statuses.schemas'
import { z } from 'zod'

export const taskStatusDraftSchema = z.object({
  id: z.string(),
  label: z.string().min(1, 'errors.required_field').max(50),
  color: z.string().nullable(),
  isDefault: z.boolean(),
  isNew: z.boolean().optional()
})
export type TaskStatusDraft = z.infer<typeof taskStatusDraftSchema>

export const tasksSettingsSchema = z
  .object({
    defaultTasksView: z.enum(TASKS_VIEWS),
    showListTab: z.boolean(),
    showKanbanTab: z.boolean(),
    showTableTab: z.boolean(),
    showMatrixTab: z.boolean(),
    statuses: z.array(taskStatusDraftSchema).min(1)
  })
  .refine((v) => v.showListTab || v.showKanbanTab || v.showTableTab || v.showMatrixTab, {
    message: 'tasks.settings.at_least_one_visible',
    path: ['showListTab']
  })
  .refine((v) => PROTECTED_LABELS.every((p) => v.statuses.some((s) => s.label === p)), {
    message: 'task_status_settings.protected_required',
    path: ['statuses']
  })
  .refine(
    (v) => {
      const labels = v.statuses.map((s) => s.label.trim()).filter(Boolean)
      return new Set(labels).size === labels.length
    },
    {
      message: 'errors.task_status.label_collision',
      path: ['statuses']
    }
  )

export type TasksSettingsFormValues = z.infer<typeof tasksSettingsSchema>
