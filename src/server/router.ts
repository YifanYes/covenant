import { areasRouter } from './routers/areas.router'
import { authRouter } from './routers/auth.router'
import { characterRouter } from './routers/character.router'
import { dashboardRouter } from './routers/dashboard.router'
import { habitsRouter } from './routers/habits.router'
import { journalingRouter } from './routers/journal.router'
import { killRecordRouter } from './routers/kill-record.router'
import { objectivesRouter } from './routers/objectives.router'
import { questRouter } from './routers/quest.router'
import { storeRouter } from './routers/store.router'
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
  habits: habitsRouter,
  journaling: journalingRouter,
  dashboard: dashboardRouter,
  quest: questRouter,
  killRecord: killRecordRouter,
  store: storeRouter
})

export type AppRouter = typeof appRouter
