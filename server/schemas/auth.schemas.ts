import { z } from 'zod/v4'

export const forgotPasswordSchema = z.object({
  email: z.email()
})
export type ForgotPasswordSchema = z.infer<typeof forgotPasswordSchema>

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
