import { captureException } from '@sentry/nextjs'
import { createContext } from '@/server/context'
import { appRouter } from '@/server/router'
import { TRPCError } from '@trpc/server'
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'

function isUnexpectedInternal(error: TRPCError): boolean {
  if (error.code !== 'INTERNAL_SERVER_ERROR') return false
  if (error.cause instanceof TRPCError) return false
  return true
}

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: ({ req }) => createContext(req),
    onError: ({ error, path, ctx }) => {
      if (!isUnexpectedInternal(error) || !error.cause) return

      captureException(error.cause, {
        user: ctx?.user ? { id: ctx.user.id, email: ctx.user.email || undefined } : undefined,
        tags: { 'trpc.path': path ?? 'unknown', 'trpc.code': error.code }
      })
    }
  })

export { handler as GET, handler as POST }
