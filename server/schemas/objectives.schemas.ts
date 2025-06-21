import { z } from 'zod/v4'

export const createObjectiveSchema = z.object({
  name: z.string(),
  description: z.string().optional()
})

export const updateObjectiveSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string().optional()
})

export const deleteObjectiveSchema = z.object({
  id: z.uuid()
})
