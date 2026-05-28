import { z } from 'zod'
import { bigintIdSchema, publicIdSchema } from './ids.schemas'

export enum HabitTimespan {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY'
}

export const createHabitSchema = z.object({
  name: z.string().min(1, 'errors.required_field').max(255),
  description: z.string().optional(),
  recurrence: z.number().int().min(1),
  timespan: z.enum(HabitTimespan),
  objectives: z.array(bigintIdSchema).optional(),
  areas: z.array(publicIdSchema).optional()
})
export type CreateHabitType = z.infer<typeof createHabitSchema>

export const updateHabitSchema = z.object({
  publicId: publicIdSchema,
  name: z.string().min(1, 'errors.required_field').max(255),
  description: z.string().optional(),
  recurrence: z.number().int().min(1).optional(),
  timespan: z.enum(HabitTimespan).optional(),
  objectives: z.array(bigintIdSchema).optional(),
  areas: z.array(publicIdSchema).optional()
})
export type UpdateHabitType = z.infer<typeof updateHabitSchema>

export const habitIdSchema = z.object({
  publicId: publicIdSchema
})

export const habitCompletionIdSchema = z.object({
  publicId: publicIdSchema
})
