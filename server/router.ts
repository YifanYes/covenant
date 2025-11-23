import { areasRouter } from './routers/areas.router'
import { authRouter } from './routers/auth.router'
import { characterRouter } from './routers/character.router'
import { habitsRouter } from './routers/habits.router'
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
  character: characterRouter,
  objectives: objectivesRouter,
  areas: areasRouter,
  tasks: tasksRouter,
  habits: habitsRouter
})

export type AppRouter = typeof appRouter
