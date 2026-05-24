import { z } from 'zod'

export const TUTORIAL_SLIDE_IDS = ['character', 'mana', 'combat', 'gear'] as const
export const tutorialSlideIdSchema = z.enum(TUTORIAL_SLIDE_IDS)
export type TutorialSlideId = z.infer<typeof tutorialSlideIdSchema>

export const onboardingProgressSchema = z.object({
  habitCreated: z.boolean().optional(),
  taskCreated: z.boolean().optional(),
  manaEarned: z.boolean().optional(),
  questStarted: z.boolean().optional(),
  gearEquipped: z.boolean().optional(),
  dismissedAt: z.string().datetime().optional(),
  collapsed: z.boolean().optional()
})
export type OnboardingProgress = z.infer<typeof onboardingProgressSchema>

export const ONBOARDING_STEP_KEYS = [
  'habitCreated',
  'taskCreated',
  'manaEarned',
  'questStarted',
  'gearEquipped'
] as const
export type OnboardingStepKey = (typeof ONBOARDING_STEP_KEYS)[number]

export const updateOnboardingProgressSchema = z.object({
  habitCreated: z.boolean().optional(),
  taskCreated: z.boolean().optional(),
  manaEarned: z.boolean().optional(),
  questStarted: z.boolean().optional(),
  gearEquipped: z.boolean().optional(),
  collapsed: z.boolean().optional()
})
export type UpdateOnboardingProgressInput = z.infer<typeof updateOnboardingProgressSchema>

export const markTutorialSlideSeenSchema = z.object({
  slideId: tutorialSlideIdSchema
})
