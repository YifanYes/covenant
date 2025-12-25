import { z } from 'zod/v4'

const envSchema = z.object({
  VITE_API_URL: z.url()
})

const _env = envSchema.safeParse(import.meta.env)

if (_env.error) {
  console.error('❌ Invalid environment variables:', z.treeifyError(_env.error))
  process.exit(1)
}

export const env = _env.data
