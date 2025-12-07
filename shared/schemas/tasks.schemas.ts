import { z } from 'zod'

export enum TaskStatus {
  TODO = 'TODO',
  DOING = 'DOING',
  DONE = 'DONE'
}

export const createTaskSchema = z.object({
  title: z.string().min(1, 'errors.required_field'),
  description: z.string().optional(),
  status: z.string().min(1, 'errors.required_field'),
  color: z.string().optional(),
  order: z.number().int().min(0).optional(),
  dueDate: z
    .date()
    .nullable()
    .optional()
    .or(z.string().transform((str) => (str ? new Date(str) : null))),
  objectives: z.array(z.uuid()).optional()
})
export type CreateTaskType = z.infer<typeof createTaskSchema>

export const updateTaskSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1, 'errors.required_field'),
  description: z.string().optional().nullable(),
  status: z.string().optional(),
  color: z.string().optional().nullable(),
  order: z.number().int().min(0).optional(),
  dueDate: z
    .date()
    .nullish()
    .or(z.string().transform((str) => (str ? new Date(str) : null))),
  objectives: z.array(z.uuid()).optional()
})
export type UpdateTaskType = z.infer<typeof updateTaskSchema>

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
