import { Prisma, PrismaClient } from '@/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { env } from '../config'
import { hashSessionToken } from './session-token'

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

// Store the base client in global — not the extended variant — to avoid double-extension on hot-reload.
const baseClient = globalForPrisma.prisma || new PrismaClient({ adapter })

if (env.NODE_ENV !== 'production') globalForPrisma.prisma = baseClient

// Restore the raw token on a returned row so callers (better-auth) keep operating on raw tokens.
// Without this, the hashed value leaks back out via session.token and gets written to the cookie,
// breaking the next request because the cookie's hashed value gets hashed again on lookup.
function restoreToken<T>(row: T, rawToken: string | null): T {
  if (!rawToken || !row || typeof row !== 'object') return row
  if ('token' in row && typeof (row as { token: unknown }).token === 'string') {
    return { ...(row as object), token: rawToken } as T
  }
  return row
}

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
        return restoreToken(result, rawToken)
      },
      async findFirst({ args, query }) {
        const rawToken = typeof args.where?.token === 'string' ? args.where.token : null
        if (rawToken) {
          args.where = { ...args.where, token: hashSessionToken(rawToken) }
        }
        const result = await query(args)
        return restoreToken(result, rawToken)
      },
      async findMany({ args, query }) {
        const token = args.where?.token
        let restoreMap: Map<string, string> | null = null
        if (typeof token === 'string') {
          const hashed = hashSessionToken(token)
          args.where = { ...args.where, token: hashed }
          restoreMap = new Map([[hashed, token]])
        } else if (token !== null && typeof token === 'object' && Array.isArray(token.in)) {
          restoreMap = new Map()
          const hashedIn = token.in.map((t: string) => {
            const h = hashSessionToken(t)
            restoreMap!.set(h, t)
            return h
          })
          args.where = { ...args.where, token: { ...token, in: hashedIn } }
        }
        const result = await query(args)
        if (Array.isArray(result) && restoreMap) {
          return result.map((row) => {
            if (row && typeof row === 'object' && 'token' in row && typeof (row as { token: unknown }).token === 'string') {
              const raw = restoreMap!.get((row as { token: string }).token)
              if (raw) return { ...(row as object), token: raw }
            }
            return row
          })
        }
        return result
      },
      async update({ args, query }) {
        // better-auth's updateSession uses WHERE token = ? (not by id)
        const rawToken = typeof args.where?.token === 'string' ? args.where.token : null
        if (rawToken) {
          args.where = { ...args.where, token: hashSessionToken(rawToken) }
        }
        const result = await query(args)
        return restoreToken(result, rawToken)
      },
      async delete({ args, query }) {
        const rawToken = typeof args.where?.token === 'string' ? args.where.token : null
        if (rawToken) {
          args.where = { ...args.where, token: hashSessionToken(rawToken) }
        }
        const result = await query(args)
        return restoreToken(result, rawToken)
      },
      async deleteMany({ args, query }) {
        if (typeof args.where?.token === 'string') {
          args.where = { ...args.where, token: hashSessionToken(args.where.token) }
        }
        return query(args)
      },
    },
  },
})

// $extends returns a subtype TypeScript won't accept as PrismaClient without a cast.
// The runtime shape is fully compatible — all repository and service operations work unchanged.
export const prisma = baseClient.$extends(sessionHashExtension) as unknown as PrismaClient
