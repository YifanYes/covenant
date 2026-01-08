import { MISSIONS, getMission } from '@shared/constants/missions'
import { MissionStatus } from '@shared/types/gamification.types'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { getCharacterProgress } from '../services/character.services'
import { protectedProcedure, t } from '../trpc'

export const missionsRouter = t.router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const character = await ctx.prisma.character.findUnique({
      where: { userId: ctx.user.id },
      include: { classes: true, party: { include: { missions: true } } }
    })

    if (!character || !character.party) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Character or party not found' })
    }

    const { tier } = getCharacterProgress(character)

    const completedMissionIds = character.party.missions.reduce<Set<string>>(
      (acc, m) => (m.status === MissionStatus.COMPLETED ? acc.add(m.name) : acc),
      new Set()
    )

    // Filter missions by tier and exclude completed
    const availableMissions = Object.values(MISSIONS).filter(
      (m) => m.requiredTier <= tier && !completedMissionIds.has(m.id)
    )

    return {
      missions: availableMissions,
      characterTier: tier
    }
  }),

  getActive: protectedProcedure.query(async ({ ctx }) => {
    const character = await ctx.prisma.character.findUnique({
      where: { userId: ctx.user.id },
      include: { party: true }
    })

    if (!character || !character.party) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Character or party not found' })
    }

    if (!character.party.currentMissionId) {
      return null
    }

    const activeMission = await ctx.prisma.mission.findUnique({
      where: { id: character.party.currentMissionId }
    })

    if (!activeMission) {
      return null
    }

    // Get mission template for additional data
    const template = getMission(activeMission.name)

    return {
      mission: activeMission,
      template
    }
  }),

  start: protectedProcedure.input(z.object({ missionId: z.string() })).mutation(async ({ ctx, input }) => {
    const character = await ctx.prisma.character.findUnique({
      where: { userId: ctx.user.id },
      include: { classes: true, party: true }
    })

    if (!character || !character.party) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Character or party not found' })
    }

    if (character.party.currentMissionId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Already has an active mission' })
    }

    const template = getMission(input.missionId)
    if (!template) {
      throw new TRPCError({ code: 'NOT_FOUND', message: `Mission ${input.missionId} not found` })
    }

    const { tier } = getCharacterProgress(character)
    if (tier < template.requiredTier) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Requires Tier ${template.requiredTier}`
      })
    }

    const mission = await ctx.prisma.mission.create({
      data: {
        partyId: character.party.id,
        name: template.id,
        description: template.description,
        requiredTier: template.requiredTier,
        status: MissionStatus.ACTIVE,
        currentPhase: 0,
        rewards: template.rewards as any
      }
    })

    await ctx.prisma.party.update({
      where: { id: character.party.id },
      data: { currentMissionId: mission.id }
    })

    return { mission, template }
  }),

  abandon: protectedProcedure.mutation(async ({ ctx }) => {
    const character = await ctx.prisma.character.findUnique({
      where: { userId: ctx.user.id },
      include: { party: true }
    })

    if (!character || !character.party) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Character or party not found' })
    }

    if (!character.party.currentMissionId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'No active mission to abandon' })
    }

    await ctx.prisma.mission.update({
      where: { id: character.party.currentMissionId },
      data: { status: MissionStatus.FAILED, completedAt: new Date() }
    })

    await ctx.prisma.party.update({
      where: { id: character.party.id },
      data: { currentMissionId: null }
    })

    return { success: true }
  })
})
