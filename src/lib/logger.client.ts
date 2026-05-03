'use client'

type LogLevel = 'error' | 'warn' | 'info'

function ship(level: LogLevel, message: string, context?: unknown) {
  fetch('/api/logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ level, message, context, timestamp: new Date().toISOString(), source: 'client' })
  }).catch(() => {})
}

function log(level: LogLevel, message: string, context?: unknown) {
  if (process.env.NODE_ENV !== 'production') {
    console[level](message, context)
  }
  ship(level, message, context)
}

export const clientLogger = {
  error: (message: string, context?: unknown) => log('error', message, context),
  warn: (message: string, context?: unknown) => log('warn', message, context),
  info: (message: string, context?: unknown) => log('info', message, context),
}
