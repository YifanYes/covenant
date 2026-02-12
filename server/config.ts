import dotenv from 'dotenv'
import { z } from 'zod'
import { logger } from './lib/logger'

dotenv.config()

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
  FRONT_URL: z.url().min(1),
  APP_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  RESEND_API_KEY: z.string().min(1),
  FROM_EMAIL: z.string().email(),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).optional()
})

const _env = envSchema.safeParse(process.env)

if (_env.success === false) {
  logger.fatal({ issues: _env.error.issues }, 'Invalid environment variables')
  process.exit(1)
}

export const env = _env.data
