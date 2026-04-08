import pino from 'pino'

// Read process.env directly (not from config.ts) to avoid circular dependency
const validLevels = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'] as const
const envLevel = process.env.LOG_LEVEL
const nodeEnv = process.env.NODE_ENV as string
const level = envLevel && validLevels.includes(envLevel as (typeof validLevels)[number])
  ? envLevel
  : nodeEnv === 'production' ? 'info' : 'debug'

export const logger = pino({
  level,
  ...(nodeEnv !== 'production'
    ? { transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:mm:ss.l', ignore: 'pid,hostname' } } }
    : {})
})
