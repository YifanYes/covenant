import { z } from 'zod'

export const createTaskSchema = z.object({
  title: z.string().min(1, 'errors.required_field'),
  description: z.string().optional(),
  status: z.string().min(1, 'errors.required_field'),
  order: z.number().int().min(0),
  dueDate: z.iso.datetime().optional(),
  objectives: z.array(z.uuid()).optional()
})

export const updateTaskSchema = z.object({
  id: z.uuid(),
  title: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  status: z.string().optional(),
  order: z.number().int().min(0).optional(),
  dueDate: z.date().optional().nullable(),
  objectives: z.array(z.uuid()).optional()
})

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
