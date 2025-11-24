import { z } from "zod"

export enum HabitTimespan {
  DAILY = "DAILY",
  WEEKLY = "WEEKLY",
  MONTHLY = "MONTHLY"
}

export const createHabitSchema = z.object({
  name: z.string().min(1, "errors.required_field").max(255),
  description: z.string().optional(),
  recurrence: z.number().int().min(1),
  timespan: z.enum(HabitTimespan),
  objectives: z.array(z.uuid()).optional()
})
export type CreateHabitType = z.infer<typeof createHabitSchema>

export const updateHabitSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1, "errors.required_field").max(255),
  description: z.string().optional(),
  recurrence: z.number().int().min(1).optional(),
  timespan: z.enum(HabitTimespan).optional(),
  objectives: z.array(z.uuid()).optional()
})
export type UpdateHabitType = z.infer<typeof updateHabitSchema>

export const habitIdSchema = z.object({
  id: z.uuid()
})

export const habitCompletionIdSchema = z.object({
  id: z.uuid()
})
