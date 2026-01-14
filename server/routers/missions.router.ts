import { attackSchema } from '@shared/schemas/missions.schemas'
import { z } from 'zod'
import { protectedProcedure, t } from '../trpc'

export const missionsRouter = t.router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.services.mission.listAvailableMissions(ctx.user.id)
  }),

  getActive: protectedProcedure.query(async ({ ctx }) => {
    return ctx.services.mission.getActiveMission(ctx.user.id)
  }),

  start: protectedProcedure.input(z.object({ missionId: z.string() })).mutation(async ({ ctx, input }) => {
    return ctx.services.mission.startMission(ctx.user.id, input.missionId)
  }),

  abandon: protectedProcedure.mutation(async ({ ctx }) => {
    return ctx.services.mission.abandonMission(ctx.user.id)
  }),

  complete: protectedProcedure.mutation(async ({ ctx }) => {
    return ctx.services.mission.completeMission(ctx.user.id)
  }),

  advancePhase: protectedProcedure.mutation(async ({ ctx }) => {
    return ctx.services.mission.advancePhase(ctx.user.id)
  }),

  history: protectedProcedure.query(async ({ ctx }) => {
    return ctx.services.mission.getMissionHistory(ctx.user.id)
  }),

  attack: protectedProcedure.input(attackSchema).mutation(async ({ ctx, input }) => {
    return ctx.services.combat.executeAttack(ctx.user.id, input)
  })
})
