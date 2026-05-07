import { Faction } from '@shared/constants/factions'
import { z } from 'zod'

export const loginSchema = z.object({
  email: z.email('errors.invalid_email'),
  password: z.string().min(8, 'errors.invalid_password_length')
})
export type LoginType = z.infer<typeof loginSchema>

export const signUpSchema = z
  .object({
    name: z.string().min(1, 'errors.required_field'),
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
