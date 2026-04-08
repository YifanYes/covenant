import { prisma } from './lib/prisma'
import { auth } from './lib/auth'
import { ServiceFactory } from './services/service.factory'
import { logger } from './lib/logger'

export async function createContext(req: Request) {
  let user = null

  try {
    const session = await auth.api.getSession({ headers: req.headers })
    if (session) {
      user = session.user
    }
  } catch {
    // Session invalid or not present
  }

  const services = new ServiceFactory(prisma)
  const log = user ? logger.child({ userId: user.id }) : logger

  return { user, prisma, services, log }
}

export type Context = Awaited<ReturnType<typeof createContext>>
