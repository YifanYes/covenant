import { areasRouter } from './routers/areas.router'
import { authRouter } from './routers/auth.router'
import { objectivesRouter } from './routers/objectives.router'
import { tasksRouter } from './routers/tasks.router'
import { publicProcedure, t } from './trpc'

export const appRouter = t.router({
  health: publicProcedure.query(() => {
    return {
      message: 'Server online'
    }
  }),
  auth: authRouter,
  objectives: objectivesRouter,
  areas: areasRouter,
  tasks: tasksRouter
})

export type AppRouter = typeof appRouter
