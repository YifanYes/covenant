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
  CRON_SECRET: z.string().min(1).optional(),
  // Transactional email (Brevo HTTP API). Optional in dev/test so the app boots without
  // credentials; verification and password-reset flows fail loudly if a send is attempted
  // without them set.
  BREVO_API_KEY: z.string().min(1).optional(),
  FROM_EMAIL: z.email().optional(),
  // Distributed rate-limit backing store (Upstash Redis REST API). Optional in dev/test;
  // when unset, rate limiting falls back to in-memory per-instance state.
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  // PostHog analytics + feature flags. Optional in dev/test; init is gated on
  // NODE_ENV === 'production' so unset keys outside prod simply no-op.
  POSTHOG_KEY: z.string().min(1).optional(),
  POSTHOG_HOST: z.string().url().default('https://eu.i.posthog.com'),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().default('https://eu.i.posthog.com')
})

const _env = envSchema.safeParse(process.env)

if (_env.success === false) {
  logger.fatal({ issues: _env.error.issues }, 'Invalid environment variables')
  throw new Error('Invalid environment variables')
}

export const env = _env.data
