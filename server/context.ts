import type { FastifyRequest } from 'fastify'
import { prisma } from './lib/prisma'
import { supabase } from './lib/supabase'
import { ServiceFactory } from './services/service.factory'

export async function createContext({ req }: { req: FastifyRequest }) {
  const authHeader = req.headers.authorization
  const token = authHeader?.split(' ')[1]

  let user = null
  if (token) {
    const { data, error } = await supabase.auth.getUser(token)
    if (!error) user = data.user
  }

  const services = new ServiceFactory(prisma, supabase)

  return { user, supabase, prisma, services }
}

export type Context = Awaited<ReturnType<typeof createContext>>
