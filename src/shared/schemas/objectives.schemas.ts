import { z } from 'zod'

export const objectiveSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1, 'errors.required_field'),
  description: z.string().optional(),
  dueDate: z
    .date()
    .nullish()
    .or(z.string().transform((str) => (str ? new Date(str) : null))),
  areas: z.array(z.uuid()).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  completedAt: z.date().nullish()
})

export const createObjectiveSchema = objectiveSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true
})
export type CreateObjectiveBodyType = z.input<typeof createObjectiveSchema>

export const updateObjectiveSchema = objectiveSchema.omit({
  createdAt: true,
  updatedAt: true,
  completedAt: true
})
export type UpdateObjectiveBodyType = z.input<typeof updateObjectiveSchema>

export const completeObjectiveSchema = objectiveSchema.pick({ id: true })
export type CompleteObjectiveBodyType = z.input<typeof completeObjectiveSchema>

export const deleteObjectiveSchema = z.object({
  id: z.uuid()
})
