import { z } from 'zod'

export const forgotPasswordSchema = z.object({
  email: z.email('errors.invalid_email')
})
export type ForgotPasswordSchema = z.infer<typeof forgotPasswordSchema>

export const recoverPasswordSchema = z
  .object({
    password: z.string().min(6, 'errors.invalid_password_length'),
    confirmPassword: z.string()
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'errors.password_mismatch'
  })
export type RecoverPasswordSchema = z.infer<typeof recoverPasswordSchema>

export const signUpSchema = z
  .object({
    email: z.email('errors.invalid_email'),
    password: z.string().min(6, 'errors.invalid_password_length'),
    confirmPassword: z.string()
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'errors.password_mismatch'
  })
export type SignUpSchema = z.infer<typeof signUpSchema>

export const loginSchema = z.object({
  email: z.email('errors.invalid_email'),
  password: z.string()
})
export type LoginSchema = z.infer<typeof loginSchema>

export const refreshTokenSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string()
})
export type RefreshTokenSchema = z.infer<typeof refreshTokenSchema>

export const emailSchema = z.object({
  email: z.email('errors.invalid_email')
})
export type EmailSchema = z.infer<typeof emailSchema>

export const updatePasswordSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  password: z.string()
})
export type UpdatePasswordSchema = z.infer<typeof updatePasswordSchema>
