import { z } from "zod"

export const createAreaSchema = z.object({
  name: z.string().min(1, "errors.required_field"),
  color: z.string().optional(),
  icon: z.string().optional()
})
export type CreateAreaBodyType = z.infer<typeof createAreaSchema>

export const updateAreaSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1, "errors.required_field"),
  color: z.string().optional(),
  icon: z.string().optional()
})
export type UpdateAreaBodyType = z.infer<typeof updateAreaSchema>

export const deleteAreaSchema = z.object({
  id: z.uuid()
})

export const defaultAreas = [
  {
    name: "areas.finances",
    color: "green",
    icon: "Banknote"
  },
  {
    name: "areas.mental_health",
    color: "purple",
    icon: "Brain"
  },
  {
    name: "areas.family_and_friends",
    color: "orange",
    icon: "Users"
  },
  {
    name: "areas.love",
    color: "red",
    icon: "Heart"
  },
  {
    name: "areas.career",
    color: "blue",
    icon: "BriefcaseBusiness"
  },
  {
    name: "areas.physical_health",
    color: "yellow",
    icon: "Dumbbell"
  },
  {
    name: "areas.leisure",
    color: "teal",
    icon: "Gamepad2"
  }
]
