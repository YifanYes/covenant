import { ENEMIES, type EnemyTemplate, type EnemyType } from './enemies'

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
  communityBonus: number
  enemySpawnWeights: Record<string, number> // Enemy spawn weights: enemyId -> probability weight (sum doesn't need to be 100)
  successConsequence: string
  failureConsequence: string
  successText: string
  failureText: string
}

export const ACTIVITIES: Record<string, ActivityTemplate> = {
  defense_north_gate: {
    id: 'defense_north_gate',
    name: 'activities.defense_north_gate.name',
    mapId: 'northern_fortress',
    position: { x: 50, y: 15 },
    factionId: Faction.HOLY_KNIGHTS,
    description: 'activities.defense_north_gate.description',
    objective: 'activities.defense_north_gate.objective',
    baseTarget: 50,
    difficulty: ActivityDifficulty.EASY,
    durationDays: 30,
    communityBonus: 500,
    enemySpawnWeights: {
      shadow_demon: 70,
      elite_demon: 30
    },
    successConsequence: 'activities.defense_north_gate.success_consequence',
    failureConsequence: 'activities.defense_north_gate.failure_consequence',
    successText: 'activities.defense_north_gate.success_text',
    failureText: 'activities.defense_north_gate.failure_text'
  },
  assault_ships: {
    id: 'assault_ships',
    name: 'activities.assault_ships.name',
    mapId: 'coastal_harbor',
    position: { x: 15, y: 50 },
    factionId: Faction.HOLY_KNIGHTS,
    description: 'activities.assault_ships.description',
    objective: 'activities.assault_ships.objective',
    baseTarget: 50,
    difficulty: ActivityDifficulty.EASY,
    durationDays: 14,
    communityBonus: 600,
    enemySpawnWeights: {
      bandit_stalker: 40,
      bandit_runic: 30
    },
    successConsequence: 'activities.assault_ships.success_consequence',
    failureConsequence: 'activities.assault_ships.failure_consequence',
    successText: 'activities.assault_ships.success_text',
    failureText: 'activities.assault_ships.failure_text'
  },
  defense_south_wall: {
    id: 'defense_south_wall',
    name: 'activities.defense_south_wall.name',
    mapId: 'southern_outpost',
    position: { x: 50, y: 85 },
    factionId: Faction.HOLY_KNIGHTS,
    description: 'activities.defense_south_wall.description',
    objective: 'activities.defense_south_wall.objective',
    baseTarget: 50,
    difficulty: ActivityDifficulty.EASY,
    durationDays: 21,
    communityBonus: 400,
    enemySpawnWeights: {
      magma_demon: 80,
      elite_demon: 20
    },
    successConsequence: 'activities.defense_south_wall.success_consequence',
    failureConsequence: 'activities.defense_south_wall.failure_consequence',
    successText: 'activities.defense_south_wall.success_text',
    failureText: 'activities.defense_south_wall.failure_text'
  }
}

export function getActivityById(id: string): ActivityTemplate | undefined {
  return ACTIVITIES[id]
}

export function selectRandomEnemy(weights: Record<string, number>): string {
  const entries = Object.entries(weights)
  const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0)
  let random = Math.random() * totalWeight

  for (const [enemyId, weight] of entries) {
    random -= weight

    if (random <= 0) {
      return enemyId
    }
  }

  return entries[0][0]
}

export interface FilteredEnemy {
  id: string
  template: EnemyTemplate
  weight: number
}

/**
 * Filter enemies for spawning based on:
 * - Activity spawn weights (enemy must be in the activity's weight list)
 * - Maximum tier (enemy tier must be <= maxTier)
 * - Required enemy type (optional, filters by MINION/ELITE/BOSS)
 */
export function filterEnemiesForSpawn(
  weights: Record<string, number>,
  maxTier: number,
  requiredType?: EnemyType
): FilteredEnemy[] {
  const filtered: FilteredEnemy[] = []

  for (const [enemyId, weight] of Object.entries(weights)) {
    const template = ENEMIES[enemyId]
    if (!template) continue

    // Check tier cap
    if (template.tier > maxTier) continue

    // Check required type if specified
    if (requiredType && template.type !== requiredType) continue

    filtered.push({ id: enemyId, template, weight })
  }

  return filtered
}

/**
 * Select a random enemy from a filtered pool based on weights
 * Returns null if pool is empty
 */
export function selectEnemyFromPool(pool: FilteredEnemy[]): FilteredEnemy | null {
  if (pool.length === 0) return null

  const totalWeight = pool.reduce((sum, entry) => sum + entry.weight, 0)
  let random = Math.random() * totalWeight

  for (const entry of pool) {
    random -= entry.weight
    if (random <= 0) {
      return entry
    }
  }

  return pool[0]
}

/**
 * Select an enemy with fallback chain:
 * 1. Match type AND tier <= character tier
 * 2. Match any type at tier <= character tier
 * 3. Use original selectRandomEnemy behavior
 */
export function selectEnemyWithFallback(
  weights: Record<string, number>,
  characterTier: number,
  requiredType?: EnemyType
): { enemyId: string; template: EnemyTemplate } | null {
  // Try 1: Match type AND tier
  if (requiredType) {
    const pool = filterEnemiesForSpawn(weights, characterTier, requiredType)
    const selected = selectEnemyFromPool(pool)
    if (selected) {
      return { enemyId: selected.id, template: selected.template }
    }
  }

  // Try 2: Match any type at tier <= character tier
  const anyTypePool = filterEnemiesForSpawn(weights, characterTier)
  const anySelected = selectEnemyFromPool(anyTypePool)
  if (anySelected) {
    return { enemyId: anySelected.id, template: anySelected.template }
  }

  // Try 3: Original behavior (no tier filtering)
  const enemyId = selectRandomEnemy(weights)
  const template = ENEMIES[enemyId]
  if (template) {
    return { enemyId, template }
  }

  return null
}
