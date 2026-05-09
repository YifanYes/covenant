import { Prisma, PrismaClient } from '@/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { env } from '../config'
import { hashWhereToken, restoreTokenFromMap } from './session-hash'
import { hashSessionToken } from './session-token'

// Parse URL and use explicit parameters to avoid connection string parsing issues
const url = new URL(env.DATABASE_URL)
const pool = new Pool({
  host: url.hostname,
  port: parseInt(url.port) || 5432,
  user: url.username,
  password: decodeURIComponent(url.password),
  database: url.pathname.slice(1),
  ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  min: 1,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
})
const adapter = new PrismaPg(pool)

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

// Store the base client in global — not the extended variant — to avoid double-extension on hot-reload.
const baseClient = globalForPrisma.prisma || new PrismaClient({ adapter })

if (env.NODE_ENV !== 'production') globalForPrisma.prisma = baseClient

const sessionHashExtension = Prisma.defineExtension({
  name: 'session-token-hash',
  query: {
    session: {
      async create({ args, query }) {
        const rawToken = typeof args.data?.token === 'string' ? args.data.token : null
        if (rawToken) {
          args.data = { ...args.data, token: hashSessionToken(rawToken) }
        }
        const result = await query(args)
        return restoreTokenFromMap(result, rawToken ? new Map([[hashSessionToken(rawToken), rawToken]]) : null)
      },
      async findFirst({ args, query }) {
        const { where, restoreMap } = hashWhereToken(args.where)
        args.where = where as typeof args.where
        const result = await query(args)
        return restoreTokenFromMap(result, restoreMap)
      },
      async findMany({ args, query }) {
        const { where, restoreMap } = hashWhereToken(args.where)
        args.where = where as typeof args.where
        const result = await query(args)
        if (Array.isArray(result) && restoreMap) {
          return result.map((row) => restoreTokenFromMap(row, restoreMap))
        }
        return result
      },
      async update({ args, query }) {
        const { where, restoreMap } = hashWhereToken(args.where)
        args.where = where as typeof args.where
        const result = await query(args)
        return restoreTokenFromMap(result, restoreMap)
      },
      async delete({ args, query }) {
        const { where, restoreMap } = hashWhereToken(args.where)
        args.where = where as typeof args.where
        const result = await query(args)
        return restoreTokenFromMap(result, restoreMap)
      },
      async deleteMany({ args, query }) {
        const { where } = hashWhereToken(args.where)
        args.where = where as typeof args.where
        return query(args)
      }
    }
  }
})

// $extends returns a subtype TypeScript won't accept as PrismaClient without a cast.
// The runtime shape is fully compatible — all repository and service operations work unchanged.
export const prisma = baseClient.$extends(sessionHashExtension) as unknown as PrismaClient
