import { z } from 'zod'
import { logger } from './lib/logger'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).optional(),
  CRON_SECRET: z.string().min(1).optional()
})

const _env = envSchema.safeParse(process.env)

if (_env.success === false) {
  logger.fatal({ issues: _env.error.issues }, 'Invalid environment variables')
  throw new Error('Invalid environment variables')
}

export const env = _env.data
