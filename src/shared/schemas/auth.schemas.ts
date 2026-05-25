import { Faction } from '@/shared/constants/factions.constants'
import { z } from 'zod'

export const loginSchema = z.object({
  email: z.email('errors.invalid_email'),
  password: z.string().min(8, 'errors.invalid_password_length')
})
export type LoginType = z.infer<typeof loginSchema>

export const signUpSchema = z
  .object({
    email: z.email('errors.invalid_email'),
    password: z.string().min(8, 'errors.invalid_password_length'),
    confirmPassword: z.string().min(8, 'errors.invalid_password_length')
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'errors.password_mismatch',
    path: ['confirmPassword']
  })
export type SignUpType = z.infer<typeof signUpSchema>

export const updateThemeSchema = z.object({
  theme: z.enum(Faction)
})
export type UpdateThemeType = z.infer<typeof updateThemeSchema>

export const DATE_FORMATS = ['L', 'MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD', 'DD MMM YYYY'] as const
export const TASKS_VIEWS = ['list', 'kanban', 'table', 'matrix'] as const
export type TasksView = (typeof TASKS_VIEWS)[number]
export const HABITS_VIEWS = ['today', 'list', 'grid', 'heatmap'] as const
export type HabitsView = (typeof HABITS_VIEWS)[number]
export const LOCALES = ['en', 'es'] as const
export const COLOR_MODES = ['light', 'dark'] as const

export const updateProfileSchema = z
  .object({
    characterName: z.string().trim().min(1).max(255).optional(),
    theme: z.enum(Faction).optional(),
    locale: z.enum(LOCALES).optional(),
    colorMode: z.enum(COLOR_MODES).optional(),
    defaultTasksView: z.enum(TASKS_VIEWS).optional(),
    defaultHabitsView: z.enum(HABITS_VIEWS).optional(),
    dateFormat: z.enum(DATE_FORMATS).optional(),
    showListTab: z.boolean().optional(),
    showKanbanTab: z.boolean().optional(),
    showTableTab: z.boolean().optional(),
    showMatrixTab: z.boolean().optional(),
    showTodayTab: z.boolean().optional(),
    showHabitsListTab: z.boolean().optional(),
    showGridTab: z.boolean().optional(),
    showHeatmapTab: z.boolean().optional()
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), {
    message: 'errors.no_fields_to_update'
  })
  .refine(
    (d) => {
      const tabs = [d.showListTab, d.showKanbanTab, d.showTableTab, d.showMatrixTab]
      const definedCount = tabs.filter((v) => v !== undefined).length
      if (definedCount === 0) return true
      if (definedCount !== 4) return false
      return tabs.some((v) => v === true)
    },
    { message: 'tasks.settings.at_least_one_visible', path: ['showListTab'] }
  )
  .refine(
    (d) => {
      const tabs = [d.showTodayTab, d.showHabitsListTab, d.showGridTab, d.showHeatmapTab]
      const definedCount = tabs.filter((v) => v !== undefined).length
      if (definedCount === 0) return true
      if (definedCount !== 4) return false
      return tabs.some((v) => v === true)
    },
    { message: 'habits.settings.at_least_one_visible', path: ['showTodayTab'] }
  )
export type UpdateProfileType = z.infer<typeof updateProfileSchema>

export const forgotPasswordSchema = z.object({
  email: z.email('errors.invalid_email')
})
export type ForgotPasswordType = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, 'errors.invalid_password_length'),
    confirmPassword: z.string().min(8, 'errors.invalid_password_length')
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'errors.password_mismatch',
    path: ['confirmPassword']
  })
export type ResetPasswordType = z.infer<typeof resetPasswordSchema>

export const changeEmailSchema = z.object({
  newEmail: z.email('errors.invalid_email')
})
export type ChangeEmailType = z.infer<typeof changeEmailSchema>

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(8, 'errors.invalid_password_length'),
    newPassword: z.string().min(8, 'errors.invalid_password_length'),
    confirmPassword: z.string().min(8, 'errors.invalid_password_length')
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'errors.password_mismatch',
    path: ['confirmPassword']
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    message: 'errors.new_password_same_as_current',
    path: ['newPassword']
  })
export type ChangePasswordType = z.infer<typeof changePasswordSchema>
