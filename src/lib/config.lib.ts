import { z } from 'zod'

const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().optional()
})

const _env = envSchema.safeParse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL
})

if (!_env.success) {
  console.error('Invalid environment variables:', _env.error.flatten())
  throw new Error('Invalid environment variables')
}

export const env = _env.data
