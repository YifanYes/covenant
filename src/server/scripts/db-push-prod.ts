import { spawn } from 'child_process'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { logger } from '../lib/logger'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load .env.prod explicitly ONLY if DIRECT_URL is invalid/missing
if (!process.env.DIRECT_URL) {
  const envPath = path.resolve(__dirname, '../.env.prod')
  const result = dotenv.config({ path: envPath })

  if (result.error) {
    logger.warn('Could not load .env.prod — expected in CI when secrets are injected')
  } else {
    logger.info('Loaded environment from .env.prod')
  }
} else {
  logger.info('Used existing environment variables')
}

if (!process.env.DIRECT_URL) {
  logger.error('DIRECT_URL is missing from environment')
  process.exit(1)
}

const directUrl = new URL(process.env.DIRECT_URL)
logger.info({ host: directUrl.hostname }, 'DIRECT_URL resolved')

// Run prisma db push
const prisma = spawn('npx', ['prisma', 'db', 'push', '--accept-data-loss', '--url', process.env.DIRECT_URL!], {
  cwd: path.resolve(__dirname, '..'),
  env: { ...process.env },
  stdio: 'inherit'
})

prisma.on('close', (code) => {
  process.exit(code ?? 0)
})
