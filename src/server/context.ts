import { headers } from 'next/headers'
import { prisma } from './lib/prisma'
import { auth } from './lib/auth'
import { ServiceFactory } from './services/service.factory'
import { logger } from './lib/logger'

export async function createContext(_req: Request) {
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

  return { user, prisma, services, log }
}

export type Context = Awaited<ReturnType<typeof createContext>>
