import { HABITS_VIEWS } from '@shared/schemas/auth.schemas'
import { z } from 'zod'

export const habitsSettingsSchema = z
  .object({
    defaultHabitsView: z.enum(HABITS_VIEWS),
    showTodayTab: z.boolean(),
    showHabitsListTab: z.boolean(),
    showGridTab: z.boolean(),
    showHeatmapTab: z.boolean()
  })
  .refine((v) => v.showTodayTab || v.showHabitsListTab || v.showGridTab || v.showHeatmapTab, {
    message: 'habits.settings.at_least_one_visible',
    path: ['showTodayTab']
  })

export type HabitsSettingsFormValues = z.infer<typeof habitsSettingsSchema>
