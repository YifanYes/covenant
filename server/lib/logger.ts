import pino from 'pino'

// Read process.env directly (not from config.ts) to avoid circular dependency
const validLevels = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'] as const
const envLevel = process.env.LOG_LEVEL
const level = envLevel && validLevels.includes(envLevel as (typeof validLevels)[number])
  ? envLevel
  : process.env.NODE_ENV === 'prod' ? 'info' : 'debug'

export const logger = pino({
  level,
  ...(process.env.NODE_ENV !== 'prod'
    ? { transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:mm:ss.l', ignore: 'pid,hostname' } } }
    : {})
})
