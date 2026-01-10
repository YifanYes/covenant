import { getEnemy } from '@shared/constants/enemies'
import { WeaponDamageType } from '@shared/constants/items'
import { MISSIONS, TIER_PROGRESSION } from '@shared/constants/missions'
import { CombatLogEntry, CombatLogType, EnemyState, ItemType, MissionStatus } from '@shared/types/gamification.types'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { getCharacterProgress } from '../services/character.services'
import { getFirstAliveEnemy, initializeEnemyState, resolveCombatTurn } from '../services/combat.services'
import {
  getActiveMissionOrThrow,
  getCharacterWithParty,
  getCompletedMissionIds,
  getCurrentClassOrThrow,
  getMissionTemplateOrThrow,
  updateEnemyHealth
} from '../services/mission.services'
import { protectedProcedure, t } from '../trpc'

export const missionsRouter = t.router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const character = await getCharacterWithParty(ctx.prisma, ctx.user.id, { classes: true, missions: true })
    const { tier } = getCharacterProgress(character)
    const completedMissionIds = getCompletedMissionIds(character.party.missions)

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
    const character = await getCharacterWithParty(ctx.prisma, ctx.user.id)

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
    const template = getMissionTemplateOrThrow(activeMission.name)

    return {
      mission: activeMission,
      template
    }
  }),

  start: protectedProcedure.input(z.object({ missionId: z.string() })).mutation(async ({ ctx, input }) => {
    const character = await getCharacterWithParty(ctx.prisma, ctx.user.id, { classes: true })

    if (character.party.currentMissionId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Already has an active mission' })
    }

    const template = getMissionTemplateOrThrow(input.missionId)
    const { tier } = getCharacterProgress(character)

    if (tier < template.requiredTier) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Requires Tier ${template.requiredTier}`
      })
    }

    // Initialize enemy state for phase 0
    const enemyState = initializeEnemyState(template.id, 0)

    const mission = await ctx.prisma.mission.create({
      data: {
        partyId: character.party.id,
        name: template.id,
        description: template.description,
        requiredTier: template.requiredTier,
        status: MissionStatus.ACTIVE,
        currentPhase: 0,
        enemyState: enemyState as any,
        combatLog: [],
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
    const character = await getCharacterWithParty(ctx.prisma, ctx.user.id)

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
  }),

  complete: protectedProcedure.mutation(async ({ ctx }) => {
    const character = await getCharacterWithParty(ctx.prisma, ctx.user.id, { classes: true })

    if (!character.party.currentMissionId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'No active mission to complete' })
    }

    const mission = await getActiveMissionOrThrow(ctx.prisma, character.party.currentMissionId)
    const currentClass = getCurrentClassOrThrow(character)

    // Update mission progress
    const progress = (currentClass.missionProgress as Record<string, number>) || {}
    const missionTier = mission.requiredTier
    progress[missionTier] = (progress[missionTier] || 0) + 1

    // Check for tier upgrade
    let newTier = currentClass.tier
    const requiredForNext = TIER_PROGRESSION[newTier]
    if (requiredForNext && progress[newTier] >= requiredForNext) {
      newTier += 1
    }

    // Reward gold
    const rewards = (mission.rewards as any) || {}
    const goldReward = rewards.gold || 0

    await ctx.prisma.$transaction([
      ctx.prisma.mission.update({
        where: { id: mission.id },
        data: { status: MissionStatus.COMPLETED, completedAt: new Date() }
      }),
      ctx.prisma.party.update({
        where: { id: character.party.id },
        data: { currentMissionId: null }
      }),
      ctx.prisma.characterClass.update({
        where: { id: currentClass.id },
        data: {
          tier: newTier,
          missionProgress: progress
        }
      }),
      ctx.prisma.character.update({
        where: { id: character.id },
        data: { gold: character.gold + goldReward }
      })
    ])

    return { success: true, newTier, rewards }
  }),

  attack: protectedProcedure
    .input(z.object({ diceCount: z.number().min(1).max(14) }))
    .mutation(async ({ ctx, input }) => {
      const character = await getCharacterWithParty(ctx.prisma, ctx.user.id, { classes: true })

      if (!character.party.currentMissionId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'No active mission' })
      }

      const mission = await getActiveMissionOrThrow(ctx.prisma, character.party.currentMissionId)
      const currentClass = getCurrentClassOrThrow(character)
      const { tier, diceBank } = getCharacterProgress(character)

      // Check dice availability
      if (diceBank < input.diceCount) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Not enough dice' })
      }

      // Get enemy state and find first alive enemy
      const enemyState = (mission.enemyState as unknown as EnemyState[]) || []
      const targetEnemy = getFirstAliveEnemy(enemyState)

      if (!targetEnemy) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'No enemies to attack' })
      }

      const enemyTemplate = getEnemy(targetEnemy.enemyId)
      if (!enemyTemplate) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Enemy template not found' })
      }

      // Determine weapon damage type from loadout (default to physical)
      const loadout = (character.loadout as any[]) || []
      const weapon = loadout.find((item) => item.type?.startsWith('WEAPON_'))
      const weaponDamageType: WeaponDamageType =
        weapon?.type === ItemType.WEAPON_MAGIC ? WeaponDamageType.MAGIC : WeaponDamageType.PHYSICAL

      // Get armor dice from loadout (default to 1)
      const armor = loadout.find((item) => item.type === ItemType.ARMOR)
      const armorDice = armor?.stats?.physDef || armor?.stats?.magicDef || 1

      // Resolve combat turn
      const result = resolveCombatTurn({
        diceCount: input.diceCount,
        targetEnemyId: targetEnemy.id,
        playerStrengthAtk: currentClass.strengthAtk,
        playerStrengthDef: currentClass.strengthDef,
        playerMagicAtk: currentClass.magicAtk,
        playerMagicDef: currentClass.magicDef,
        playerArmorDice: armorDice,
        playerManaRegen: currentClass.manaRegen,
        weaponDamageType,
        enemy: enemyTemplate,
        tier
      })

      // Update enemy state
      const updatedEnemyState = updateEnemyHealth(enemyState, targetEnemy.id, result.damageToEnemy)

      // Check if enemy was defeated
      const updatedTarget = updatedEnemyState.find((e) => e.id === targetEnemy.id)
      if (updatedTarget && updatedTarget.currentHealth <= 0) {
        result.logEntries.push({
          timestamp: Date.now(),
          type: CombatLogType.ENEMY_DEFEATED,
          data: { enemy: enemyTemplate.name }
        })
      }

      // Update combat log
      const existingLog = (mission.combatLog as unknown as CombatLogEntry[]) || []
      const updatedLog = [...result.logEntries.reverse(), ...existingLog]

      // Update dice bank (subtract used dice)
      const characterData = (character.data as any) || {}
      const newDiceBank = Math.max(0, diceBank - input.diceCount)

      // Calculate updated health and mana
      const newHealth = Math.max(0, currentClass.health - result.damageToPlayer)
      const newMana = Math.min(currentClass.maxMana, currentClass.mana + result.manaRegenerated)

      await ctx.prisma.$transaction([
        ctx.prisma.mission.update({
          where: { id: mission.id },
          data: {
            enemyState: updatedEnemyState as any,
            combatLog: updatedLog as any
          }
        }),
        ctx.prisma.character.update({
          where: { id: character.id },
          data: {
            data: { ...characterData, diceBank: newDiceBank }
          }
        }),
        ctx.prisma.characterClass.update({
          where: { id: currentClass.id },
          data: {
            health: newHealth,
            mana: newMana
          }
        })
      ])

      // Check if all enemies in phase are defeated
      const allDefeated = updatedEnemyState.every((e) => e.currentHealth <= 0)

      return {
        ...result,
        updatedEnemyState,
        allEnemiesDefeated: allDefeated,
        newDiceBank
      }
    }),

  advancePhase: protectedProcedure.mutation(async ({ ctx }) => {
    const character = await getCharacterWithParty(ctx.prisma, ctx.user.id)

    if (!character.party.currentMissionId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'No active mission' })
    }

    const mission = await getActiveMissionOrThrow(ctx.prisma, character.party.currentMissionId)
    const template = getMissionTemplateOrThrow(mission.name)

    const nextPhase = mission.currentPhase + 1

    // Check if mission is complete (no more phases)
    if (nextPhase >= template.phases.length) {
      return { phaseAdvanced: false, missionComplete: true }
    }

    // Initialize enemy state for next phase
    const newEnemyState = initializeEnemyState(mission.name, nextPhase)

    // Add phase complete log entry
    const existingLog = (mission.combatLog as unknown as CombatLogEntry[]) || []
    const updatedLog: CombatLogEntry[] = [
      { timestamp: Date.now(), type: CombatLogType.PHASE_COMPLETE, data: { phase: nextPhase } },
      ...existingLog
    ]

    await ctx.prisma.mission.update({
      where: { id: mission.id },
      data: {
        currentPhase: nextPhase,
        enemyState: newEnemyState as any,
        combatLog: updatedLog as any
      }
    })

    return { phaseAdvanced: true, missionComplete: false, newPhase: nextPhase, newEnemyState }
  })
})
