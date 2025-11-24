import { z } from "zod"

export const signUpSchema = z.object({
  email: z.email("errors.invalid_email")
})
export type SignUpType = z.infer<typeof signUpSchema>

export const loginSchema = z.object({
  email: z.email("errors.invalid_email")
})
export type LoginType = z.infer<typeof loginSchema>

export const verifyOTPSchema = z.object({
  email: z.email("errors.invalid_email"),
  token: z.string()
})
export type VerifyOTPType = z.infer<typeof verifyOTPSchema>

export const refreshTokenSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string()
})
export type RefreshTokenSchema = z.infer<typeof refreshTokenSchema>

export const emailSchema = z.object({
  email: z.email("errors.invalid_email")
})
export type EmailSchema = z.infer<typeof emailSchema>

export const updatePasswordSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  password: z.string()
})
export type UpdatePasswordSchema = z.infer<typeof updatePasswordSchema>
