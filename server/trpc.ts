import { initTRPC, TRPCError } from '@trpc/server'
import type { Context } from './context'

export const t = initTRPC.context<Context>().create()

export const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource'
    })
  }

  return next({ ctx: { user: ctx.user } })
})

export const protectedProcedure = t.procedure.use(isAuthed)
export const publicProcedure = t.procedure
