import { z } from 'zod'

const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().optional()
})

const _env = envSchema.safeParse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL
})

if (!_env.success) {
  throw new Error(`Invalid environment variables: ${JSON.stringify(_env.error.flatten())}`)
}

export const env = _env.data
