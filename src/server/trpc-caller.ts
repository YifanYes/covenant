import 'server-only'
import { headers } from 'next/headers'
import { appRouter } from './router'
import { createContext } from './context'
import { createCallerFactory } from './trpc'

const createCaller = createCallerFactory(appRouter)

export async function createServerCaller() {
  const headersList = await headers()
  const req = new Request('http://localhost', { headers: headersList })
  const ctx = await createContext(req)
  return createCaller(ctx)
}
