import { z } from 'zod/v4'

export const signUpSchema = z.object({
  email: z.email(),
  password: z.string()
})
export type SignUpSchema = z.infer<typeof signUpSchema>

export const loginSchema = z.object({
  email: z.email(),
  password: z.string()
})
export type LoginSchema = z.infer<typeof loginSchema>
