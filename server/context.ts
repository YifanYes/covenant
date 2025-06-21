import type { FastifyRequest } from 'fastify'
import { supabase } from './lib/supabase'

export async function createContext({ req }: { req: FastifyRequest }) {
  const authHeader = req.headers.authorization
  const token = authHeader?.split(' ')[1]

  let user = null
  if (token) {
    const { data, error } = await supabase.auth.getUser(token)
    if (!error) user = data.user
  }

  return { user }
}

export type Context = Awaited<ReturnType<typeof createContext>>
