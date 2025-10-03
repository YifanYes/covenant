import { z } from 'zod'

export const createObjectiveSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  dueDate: z
    .date()
    .nullable()
    .optional()
    .or(z.string().transform((str) => (str ? new Date(str) : null))),
  areas: z.array(z.uuid()).optional()
})
export type CreateObjectiveBodyType = z.infer<typeof createObjectiveSchema>

export const updateObjectiveSchema = z.object({
  id: z.uuid(),
  name: z.string().optional(),
  description: z.string().optional(),
  dueDate: z.iso.datetime().optional(),
  areas: z.array(z.uuid()).optional()
})

export const deleteObjectiveSchema = z.object({
  id: z.uuid()
})
