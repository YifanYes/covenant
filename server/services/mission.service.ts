import { getEnemy } from '@shared/constants/enemies'
import { getMission, MISSIONS, TIER_PROGRESSION } from '@shared/constants/missions'
import type { CombatLogEntry, EnemyState } from '@shared/types/gamification.types'
import { CombatLogType, MissionStatus } from '@shared/types/gamification.types'
import type {
  AdvancePhaseResult,
  CompleteMissionResult,
  MissionListResult,
  StartMissionResult
} from '@shared/types/mission.types'
import { TRPCError } from '@trpc/server'
import type { Mission, PrismaClient } from '../generated/prisma'
import { CharacterRepository } from '../repositories/character.repository'
import { MissionRepository } from '../repositories/mission.repository'
import { PartyRepository } from '../repositories/party.repository'

export class MissionService {
  private characterRepository: CharacterRepository
  private missionRepository: MissionRepository
  private partyRepository: PartyRepository

  constructor(private prisma: PrismaClient) {
    this.characterRepository = new CharacterRepository(prisma)
    this.missionRepository = new MissionRepository(prisma)
    this.partyRepository = new PartyRepository(prisma)
  }

  async listAvailableMissions(userId: string): Promise<MissionListResult> {
    const character = await this.prisma.character.findUnique({
      where: { userId },
      include: {
        classes: true,
        party: { include: { missions: true } }
      }
    })

    if (!character || !character.party) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Character or party not found' })
    }

    const tier = this.getTier(character)
    const completedMissionIds = this.getCompletedMissionIds(character.party.missions)

    const availableMissions = Object.values(MISSIONS).filter(
      (m) => m.requiredTier <= tier && !completedMissionIds.has(m.id)
    )

    return {
      missions: availableMissions,
      characterTier: tier
    }
  }

  async getActiveMission(userId: string) {
    const character = await this.characterRepository.findWithPartyOrThrow(userId)

    if (!character.party.currentMissionId) {
      return null
    }

    const activeMission = await this.missionRepository.findById(character.party.currentMissionId)

    if (!activeMission) {
      return null
    }

    const template = this.getMissionTemplateOrThrow(activeMission.name)

    return {
      mission: activeMission,
      template
    }
  }

  async startMission(userId: string, missionId: string): Promise<StartMissionResult> {
    const character = await this.prisma.character.findUnique({
      where: { userId },
      include: { classes: true, party: true }
    })

    if (!character || !character.party) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Character or party not found' })
    }

    if (character.party.currentMissionId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Already has an active mission' })
    }

    const template = this.getMissionTemplateOrThrow(missionId)
    const tier = this.getTier(character)

    if (tier < template.requiredTier) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Requires Tier ${template.requiredTier}`
      })
    }

    const enemyState = this.initializeEnemyState(template.id, 0)

    const mission = await this.missionRepository.create({
      partyId: character.party.id,
      name: template.id,
      description: template.description,
      requiredTier: template.requiredTier,
      enemyState,
      rewards: template.rewards
    })

    await this.partyRepository.setCurrentMission(character.party.id, mission.id)

    return { mission, template }
  }

  async abandonMission(userId: string): Promise<{ success: boolean }> {
    const character = await this.characterRepository.findWithPartyOrThrow(userId)

    if (!character.party.currentMissionId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'No active mission to abandon' })
    }

    await this.missionRepository.fail(character.party.currentMissionId)
    await this.partyRepository.setCurrentMission(character.party.id, null)

    return { success: true }
  }

  async completeMission(userId: string): Promise<CompleteMissionResult> {
    const character = await this.prisma.character.findUnique({
      where: { userId },
      include: { classes: true, party: true }
    })

    if (!character || !character.party) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Character or party not found' })
    }

    if (!character.party.currentMissionId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'No active mission to complete' })
    }

    const mission = await this.missionRepository.findActiveOrThrow(character.party.currentMissionId)
    const currentClass = this.getCurrentClassOrThrow(character)

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

    await this.prisma.$transaction([
      this.prisma.mission.update({
        where: { id: mission.id },
        data: { status: MissionStatus.COMPLETED, completedAt: new Date() }
      }),
      this.prisma.party.update({
        where: { id: character.party.id },
        data: { currentMissionId: null }
      }),
      this.prisma.characterClass.update({
        where: { id: currentClass.id },
        data: {
          tier: newTier,
          missionProgress: progress
        }
      }),
      this.prisma.character.update({
        where: { id: character.id },
        data: { gold: character.gold + goldReward }
      })
    ])

    return { success: true, newTier, rewards }
  }

  async advancePhase(userId: string): Promise<AdvancePhaseResult> {
    const character = await this.characterRepository.findWithPartyOrThrow(userId)

    if (!character.party.currentMissionId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'No active mission' })
    }

    const mission = await this.missionRepository.findActiveOrThrow(character.party.currentMissionId)
    const template = this.getMissionTemplateOrThrow(mission.name)

    const nextPhase = mission.currentPhase + 1

    if (nextPhase >= template.phases.length) {
      return { phaseAdvanced: false, missionComplete: true }
    }

    const newEnemyState = this.initializeEnemyState(mission.name, nextPhase)

    const existingLog = (mission.combatLog as unknown as CombatLogEntry[]) || []
    const updatedLog: CombatLogEntry[] = [
      { timestamp: Date.now(), type: CombatLogType.PHASE_COMPLETE, data: { phase: nextPhase } },
      ...existingLog
    ]

    await this.missionRepository.updatePhase(mission.id, nextPhase, newEnemyState, updatedLog)

    return { phaseAdvanced: true, missionComplete: false, newPhase: nextPhase, newEnemyState }
  }

  async getMissionHistory(userId: string) {
    const character = await this.characterRepository.findWithPartyOrThrow(userId)

    const missions = await this.missionRepository.findCompletedByPartyId(character.party.id)

    return missions.map((mission) => ({
      id: mission.id,
      name: mission.name,
      status: mission.status,
      completedAt: mission.completedAt,
      combatLog: (mission.combatLog as unknown as CombatLogEntry[]) || []
    }))
  }

  private initializeEnemyState(missionId: string, phase: number): EnemyState[] {
    const mission = getMission(missionId)
    if (!mission || !mission.phases[phase]) return []

    return mission.phases[phase].enemies.map((enemyId, index) => {
      const enemy = getEnemy(enemyId)
      return {
        id: `${enemyId}-${index}`,
        enemyId,
        currentHealth: enemy?.health || 3,
        maxHealth: enemy?.health || 3
      }
    })
  }

  private getMissionTemplateOrThrow(missionId: string) {
    const template = getMission(missionId)
    if (!template) {
      throw new TRPCError({ code: 'NOT_FOUND', message: `Mission ${missionId} not found` })
    }

    return template
  }

  private getCompletedMissionIds(missions: Mission[]): Set<string> {
    return new Set(missions.filter((m) => m.status === MissionStatus.COMPLETED).map((m) => m.name))
  }

  private getTier(character: { classes: { className: string; tier: number }[]; currentClass: string | null }) {
    const currentClass = character.classes.find((c) => c.className === character.currentClass)
    return currentClass?.tier || 1
  }

  private getCurrentClassOrThrow(character: {
    classes: { id: string; className: string; tier: number; missionProgress: unknown }[]
    currentClass: string | null
  }) {
    const currentClass = character.classes.find((c) => c.className === character.currentClass)
    if (!currentClass) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Character class not found' })
    }

    return currentClass
  }
}
