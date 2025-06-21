import { authRouter } from './routers/auth.router'
import { objectivesRouter } from './routers/objectives.router'
import { publicProcedure, t } from './trpc'

export const appRouter = t.router({
  health: publicProcedure.query(() => {
    return {
      message: 'Server online'
    }
  }),
  auth: authRouter,
  objectives: objectivesRouter
})

export type AppRouter = typeof appRouter
