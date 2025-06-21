import { z } from 'zod'

export const createObjectiveSchema = z.object({
  name: z.string(),
  description: z.string().optional()
})

export const updateObjectiveSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional()
})

export const deleteObjectiveSchema = z.object({
  id: z.string().uuid()
})
