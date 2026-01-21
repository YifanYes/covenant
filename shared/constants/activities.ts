export enum ActivityDifficulty {
  EASY = 'EASY',
  NORMAL = 'NORMAL',
  HARD = 'HARD'
}

export enum Faction {
  HOLY_KNIGHTS = 'HOLY_KNIGHTS',
  LEGION = 'LEGION',
  ALCHEMISTS_LEAGUE = 'ALCHEMISTS_LEAGUE',
  DEATH_MARCH = 'DEATH_MARCH',
  CRIMSON_INQUISITION = 'CRIMSON_INQUISITION',
  BLOOD_PACT = 'BLOOD_PACT'
}

export interface ActivityTemplate {
  id: string
  name: string
  mapId: string
  position: { x: number; y: number } // Percentage (0-100)
  factionId: string
  description: string
  objective: string
  baseTarget: number
  difficulty: ActivityDifficulty
  durationDays: number
  rewardPerKill: number
  communityBonus: number
  enemies: string[]
  successConsequence: string
  failureConsequence: string
  successText: string
  failureText: string
}

export const ACTIVITIES: Record<string, ActivityTemplate> = {
  defense_north_gate: {
    id: 'defense_north_gate',
    name: 'activities.defense_north_gate.name',
    mapId: 'santa_cruz',
    position: { x: 50, y: 15 },
    factionId: Faction.HOLY_KNIGHTS,
    description: 'activities.defense_north_gate.description',
    objective: 'activities.defense_north_gate.objective',
    baseTarget: 50,
    difficulty: ActivityDifficulty.EASY,
    durationDays: 30,
    rewardPerKill: 15,
    communityBonus: 500,
    enemies: ['shadow_demon', 'elite_demon'],
    successConsequence: 'activities.defense_north_gate.success_consequence',
    failureConsequence: 'activities.defense_north_gate.failure_consequence',
    successText: 'activities.defense_north_gate.success_text',
    failureText: 'activities.defense_north_gate.failure_text'
  },
  assault_ships: {
    id: 'assault_ships',
    name: 'activities.assault_ships.name',
    mapId: 'santa_cruz',
    position: { x: 15, y: 50 },
    factionId: Faction.HOLY_KNIGHTS,
    description: 'activities.assault_ships.description',
    objective: 'activities.assault_ships.objective',
    baseTarget: 50,
    difficulty: ActivityDifficulty.EASY,
    durationDays: 14,
    rewardPerKill: 15,
    communityBonus: 600,
    enemies: ['bandit_stalker', 'bandit_chief'],
    successConsequence: 'activities.assault_ships.success_consequence',
    failureConsequence: 'activities.assault_ships.failure_consequence',
    successText: 'activities.assault_ships.success_text',
    failureText: 'activities.assault_ships.failure_text'
  },
  defense_south_wall: {
    id: 'defense_south_wall',
    name: 'activities.defense_south_wall.name',
    mapId: 'santa_cruz',
    position: { x: 50, y: 85 },
    factionId: Faction.HOLY_KNIGHTS,
    description: 'activities.defense_south_wall.description',
    objective: 'activities.defense_south_wall.objective',
    baseTarget: 50,
    difficulty: ActivityDifficulty.EASY,
    durationDays: 21,
    rewardPerKill: 12,
    communityBonus: 400,
    enemies: ['magma_demon', 'elite_demon'],
    successConsequence: 'activities.defense_south_wall.success_consequence',
    failureConsequence: 'activities.defense_south_wall.failure_consequence',
    successText: 'activities.defense_south_wall.success_text',
    failureText: 'activities.defense_south_wall.failure_text'
  }
}

// Helper function for lookups
export function getActivityById(id: string): ActivityTemplate | undefined {
  return ACTIVITIES[id]
}
