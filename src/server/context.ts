import { headers } from 'next/headers'
import { auth } from './lib/auth'
import { logger } from './lib/logger'
import { prisma } from './lib/prisma'
import { ServiceFactory } from './services/service.factory'

function getClientIp(req: Request): string | null {
  // Prefer headers typically set by trusted infrastructure / load balancers
  const realIp = req.headers.get('x-real-ip')
  if (realIp) return realIp.trim()

  const cfIp = req.headers.get('cf-connecting-ip')
  if (cfIp) return cfIp.trim()

  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    const ips = forwarded.split(',').map((ip) => ip.trim())
    // Use the last IP (closest to the server / infra) to reduce spoofing risk.
    // This assumes the app is behind a trusted proxy that sanitizes this header.
    const lastIp = ips.at(-1)
    if (lastIp) return lastIp
  }

  return null
}

export async function createContext(req: Request) {
  let user = null

  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (session) {
      user = session.user
    }
  } catch (err) {
    logger.warn({ err }, 'Session lookup failed')
  }

  const services = new ServiceFactory(prisma)
  const log = user ? logger.child({ userId: user.id }) : logger
  const ip = getClientIp(req)

  return { user, prisma, services, log, ip }
}

export type Context = Awaited<ReturnType<typeof createContext>>
