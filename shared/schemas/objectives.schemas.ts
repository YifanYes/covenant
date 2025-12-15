import { z } from 'zod'

export const createObjectiveSchema = z.object({
  name: z.string().min(1, 'errors.required_field'),
  description: z.string().optional(),
  dueDate: z
    .date()
    .nullish()
    .or(z.string().transform((str) => (str ? new Date(str) : null))),
  areas: z.array(z.uuid()).optional()
})
export type CreateObjectiveBodyType = z.input<typeof createObjectiveSchema>

export const updateObjectiveSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1, 'errors.required_field'),
  description: z.string().optional(),
  dueDate: z
    .date()
    .nullish()
    .or(z.string().transform((str) => (str ? new Date(str) : null))),
  areas: z.array(z.uuid()).optional()
})
export type UpdateObjectiveBodyType = z.input<typeof updateObjectiveSchema>

export const deleteObjectiveSchema = z.object({
  id: z.uuid()
})
