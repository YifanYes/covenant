import { z } from 'zod/v4'

export const signUpSchema = z.object({
  email: z.email(),
  password: z.string(),
  confirmPassword: z.string()
})
export type SignUpSchema = z.infer<typeof signUpSchema>

export const loginSchema = z.object({
  email: z.email(),
  password: z.string()
})
export type LoginSchema = z.infer<typeof loginSchema>

export const refreshTokenSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string()
})
export type RefreshTokenSchema = z.infer<typeof refreshTokenSchema>

export const emailSchema = z.object({
  email: z.email()
})
export type EmailSchema = z.infer<typeof emailSchema>

export const updatePasswordSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  password: z.string()
})
export type UpdatePasswordSchema = z.infer<typeof updatePasswordSchema>
