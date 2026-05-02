import { activityRouter } from './routers/activity.router'
import { areasRouter } from './routers/areas.router'
import { authRouter } from './routers/auth.router'
import { characterRouter } from './routers/character.router'
import { dashboardRouter } from './routers/dashboard.router'
import { deadlineRouter } from './routers/deadline.router'
import { habitsRouter } from './routers/habits.router'
import { killRecordRouter } from './routers/kill-record.router'
import { objectivesRouter } from './routers/objectives.router'
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
  dashboard: dashboardRouter,
  activity: activityRouter,
  killRecord: killRecordRouter,
  store: storeRouter,
  deadline: deadlineRouter
})

export type AppRouter = typeof appRouter
