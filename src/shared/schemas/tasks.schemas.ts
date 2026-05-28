import { z } from 'zod'
import { publicIdSchema } from './ids.schemas'

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
  statusPublicId: publicIdSchema,
  color: z.string().optional(),
  effort: z.enum(TaskEffort).optional(),
  impact: z.enum(TaskImpact).optional(),
  order: z.number().int().min(0).optional(),
  dueDate: z
    .date()
    .nullish()
    .or(z.string().transform((str) => (str ? new Date(str) : null))),
  objectives: z.array(publicIdSchema).optional(),
  areas: z.array(publicIdSchema).optional()
})
export type CreateTaskType = z.input<typeof createTaskSchema>

export const updateTaskSchema = z.object({
  publicId: publicIdSchema,
  title: z.string().min(1, 'errors.required_field'),
  description: z.string().nullish(),
  statusPublicId: publicIdSchema.optional(),
  color: z.string().nullish(),
  effort: z.enum(TaskEffort).nullish(),
  impact: z.enum(TaskImpact).nullish(),
  order: z.number().int().min(0).optional(),
  dueDate: z
    .date()
    .nullish()
    .or(z.string().transform((str) => (str ? new Date(str) : null))),
  objectives: z.array(publicIdSchema).optional(),
  areas: z.array(publicIdSchema).optional()
})
export type UpdateTaskType = z.input<typeof updateTaskSchema>

export const taskIdSchema = z.object({
  publicId: publicIdSchema
})

export const duplicateTaskSchema = z.object({
  publicId: publicIdSchema,
  titleSuffix: z.string().optional()
})

export const bulkUpdateTasksSchema = z.object({
  tasks: z.array(
    z.object({
      publicId: publicIdSchema,
      statusPublicId: publicIdSchema,
      order: z.number().int().min(0)
    })
  )
})
export type BulkUpdateTasksType = z.infer<typeof bulkUpdateTasksSchema>
export type BulkUpdateTaskItem = BulkUpdateTasksType['tasks'][number]

export const getByDateInputSchema = z.object({
  monthIndex: z.string().optional(),
  year: z.string().optional()
})

export const getTasksFilteredSchema = z.object({
  search: z.string().optional(),
  statusPublicIds: z.array(publicIdSchema).optional(),
  effortImpact: z.array(z.string()).optional(),
  dueDate: z.string().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20)
})
export type GetTasksFilteredInput = z.infer<typeof getTasksFilteredSchema>
