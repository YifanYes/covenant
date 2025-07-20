import { z } from 'zod/v4'

const envSchema = z.object({
  NODE_ENV: z.enum(['dev', 'prod', 'test']).default('dev'),
  PORT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => val > 0 && val < 65536, {
      message: 'PORT must be a valid port number'
    }),
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1),
  SUPABASE_URL: z.url(),
  SUPABASE_SERVICE_KEY: z.string().min(1),
  FRONT_URL: z.url().min(1)
})

const _env = envSchema.safeParse(process.env)

if (_env.error) {
  console.error('❌ Invalid environment variables:', z.treeifyError(_env.error))
  process.exit(1)
}

export const env = _env.data
