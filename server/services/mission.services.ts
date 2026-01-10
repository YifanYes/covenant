import { getMission } from '@shared/constants/missions'
import { EnemyState, MissionStatus } from '@shared/types/gamification.types'
import { TRPCError } from '@trpc/server'
import { type Character, type CharacterClass, type Mission, type Party, type PrismaClient } from '../generated/prisma'

export type CharacterWithClasses = Character & { classes: CharacterClass[] }
export type CharacterWithParty = Character & { party: Party | null }
export type CharacterWithClassesAndParty = CharacterWithClasses & CharacterWithParty
export type CharacterWithPartyMissions = Character & { party: (Party & { missions: Mission[] }) | null }

export async function getCharacterWithParty<T extends { classes?: boolean; missions?: boolean }>(
  prisma: PrismaClient,
  userId: string,
  include?: T
): Promise<
  T extends { classes: true; missions: true }
    ? CharacterWithClasses & { party: Party & { missions: Mission[] } }
    : T extends { classes: true }
      ? CharacterWithClasses & { party: Party }
      : T extends { missions: true }
        ? Character & { party: Party & { missions: Mission[] } }
        : Character & { party: Party }
> {
  const character = await prisma.character.findUnique({
    where: { userId },
    include: {
      classes: include?.classes ?? false,
      party: include?.missions ? { include: { missions: true } } : true
    }
  })

  if (!character || !character.party) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Character or party not found' })
  }

  return character as any
}

export async function getActiveMissionOrThrow(prisma: PrismaClient, currentMissionId: string | null): Promise<Mission> {
  if (!currentMissionId) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'No active mission' })
  }

  const mission = await prisma.mission.findUnique({
    where: { id: currentMissionId }
  })

  if (!mission) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Mission not found' })
  }

  return mission
}

export function getCurrentClassOrThrow(character: CharacterWithClasses): CharacterClass {
  const currentClass = character.classes.find((c) => c.className === character.currentClass)

  if (!currentClass) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Character class not found' })
  }

  return currentClass
}

export function getMissionTemplateOrThrow(missionId: string) {
  const template = getMission(missionId)

  if (!template) {
    throw new TRPCError({ code: 'NOT_FOUND', message: `Mission ${missionId} not found` })
  }

  return template
}

export function getCompletedMissionIds(missions: Mission[]): Set<string> {
  return new Set(missions.filter((m) => m.status === MissionStatus.COMPLETED).map((m) => m.name))
}

export function updateEnemyHealth(enemyState: EnemyState[], targetId: string, damage: number): EnemyState[] {
  return enemyState.map((e) => (e.id === targetId ? { ...e, currentHealth: Math.max(0, e.currentHealth - damage) } : e))
}
