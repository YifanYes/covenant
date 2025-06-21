import { z } from 'zod/v4'

export const signUpSchema = z.object({
  email: z.email(),
  password: z.string()
})

export const loginSchema = z.object({
  email: z.email(),
  password: z.string()
})
