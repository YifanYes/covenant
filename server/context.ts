import type { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify'
import { prisma } from './lib/prisma'
import { auth } from './lib/auth'
import { ServiceFactory } from './services/service.factory'

export async function createContext({ req }: CreateFastifyContextOptions) {
  let user = null

  try {
    const headers = new Headers()
    Object.entries(req.headers).forEach(([key, value]) => {
      if (value) headers.append(key, Array.isArray(value) ? value.join(', ') : value)
    })

    const session = await auth.api.getSession({ headers })
    if (session) {
      user = session.user
    }
  } catch {
    // Session invalid or not present
  }

  const services = new ServiceFactory(prisma)

  return { user, prisma, services }
}

export type Context = Awaited<ReturnType<typeof createContext>>
