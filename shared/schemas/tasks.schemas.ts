import { z } from 'zod'

export enum TaskStatus {
  TODO = 'TODO',
  DOING = 'DOING',
  DONE = 'DONE'
}

export enum TaskEffort {
  HIGH = 'HIGH',
  LOW = 'LOW'
}

export enum TaskImpact {
  HIGH = 'HIGH',
  LOW = 'LOW'
}

export const createTaskSchema = z.object({
  title: z.string().min(1, 'errors.required_field'),
  description: z.string().optional(),
  status: z.string().min(1, 'errors.required_field'),
  color: z.string().optional(),
  effort: z.enum(TaskEffort).optional(),
  impact: z.enum(TaskImpact).optional(),
  order: z.number().int().min(0).optional(),
  dueDate: z
    .date()
    .nullish()
    .or(z.string().transform((str) => (str ? new Date(str) : null))),
  objectives: z.array(z.uuid()).optional()
})
export type CreateTaskType = z.input<typeof createTaskSchema>

export const updateTaskSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1, 'errors.required_field'),
  description: z.string().nullish(),
  status: z.string().optional(),
  color: z.string().nullish(),
  effort: z.enum(TaskEffort).nullish(),
  impact: z.enum(TaskImpact).nullish(),
  order: z.number().int().min(0).optional(),
  dueDate: z
    .date()
    .nullish()
    .or(z.string().transform((str) => (str ? new Date(str) : null))),
  objectives: z.array(z.uuid()).optional()
})
export type UpdateTaskType = z.input<typeof updateTaskSchema>

export const taskIdSchema = z.object({
  id: z.uuid()
})

export const bulkUpdateTasksSchema = z.object({
  tasks: z.array(
    z.object({
      id: z.uuid(),
      status: z.string().min(1, 'errors.required_field'),
      order: z.number().int().min(0)
    })
  )
})

export const getByDateInputSchema = z.object({
  monthIndex: z.string().optional(),
  year: z.string().optional()
})
