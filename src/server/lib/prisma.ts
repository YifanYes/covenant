import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { env } from '../config'
import { PrismaClient } from '@/generated/prisma'

// Parse URL and use explicit parameters to avoid connection string parsing issues
const url = new URL(env.DATABASE_URL)
const pool = new Pool({
  host: url.hostname,
  port: parseInt(url.port) || 5432,
  user: url.username,
  password: decodeURIComponent(url.password),
  database: url.pathname.slice(1),
  ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
  max: 10,
  min: 1,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
})
const adapter = new PrismaPg(pool)

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter })

if (env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
