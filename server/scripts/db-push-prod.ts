import { spawn } from 'child_process'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load .env.prod explicitly
const envPath = path.resolve(__dirname, '../.env.prod')
dotenv.config({ path: envPath, override: true })

const directUrl = new URL(process.env.DIRECT_URL!)
console.log('✅ Loaded environment from .env.prod')
console.log(`   DIRECT_URL host: ${directUrl.hostname}`)

// Run prisma db push
const prisma = spawn('npx', ['prisma', 'db', 'push', '--accept-data-loss', '--url', process.env.DIRECT_URL!], {
  cwd: path.resolve(__dirname, '..'),
  env: { ...process.env },
  stdio: 'inherit'
})

prisma.on('close', (code) => {
  process.exit(code ?? 0)
})
