import { ENEMIES, type EnemyTemplate, type EnemyType } from './enemies'

export type QuestObjectiveType = 'KILL_ENEMIES'
// Designed for extension: | 'FIND_ITEM' | 'PROTECT_NPC' | 'DEFEND_POSITION' | 'ATTACK_POSITION'

export type QuestDifficulty = 'EASY' | 'NORMAL' | 'HARD'
export type QuestStatus = 'ACTIVE' | 'COMPLETED' | 'ABANDONED'

export interface QuestObjective {
  type: QuestObjectiveType
  target: number
}

export interface QuestReward {
  gold: { min: number; max: number }
  dice?: number
}

export interface QuestTemplate {
  id: string
  name: string
  description: string
  objective: QuestObjective
  reward: QuestReward
  difficulty: QuestDifficulty
  enemySpawnWeights: Record<string, number>
}

export const QUESTS: Record<string, QuestTemplate> = {
  patrol_north_gate: {
    id: 'patrol_north_gate',
    name: 'quests.patrol_north_gate.name',
    description: 'quests.patrol_north_gate.description',
    objective: { type: 'KILL_ENEMIES', target: 5 },
    reward: { gold: { min: 20, max: 40 } },
    difficulty: 'EASY',
    enemySpawnWeights: {
      shadow_demon: 70,
      elite_demon: 30
    }
  },
  assault_the_harbor: {
    id: 'assault_the_harbor',
    name: 'quests.assault_the_harbor.name',
    description: 'quests.assault_the_harbor.description',
    objective: { type: 'KILL_ENEMIES', target: 8 },
    reward: { gold: { min: 30, max: 60 } },
    difficulty: 'NORMAL',
    enemySpawnWeights: {
      bandit_stalker: 40,
      bandit_runic: 30,
      elite_demon: 30
    }
  },
  defend_the_southern_wall: {
    id: 'defend_the_southern_wall',
    name: 'quests.defend_the_southern_wall.name',
    description: 'quests.defend_the_southern_wall.description',
    objective: { type: 'KILL_ENEMIES', target: 10 },
    reward: { gold: { min: 50, max: 100 } },
    difficulty: 'HARD',
    enemySpawnWeights: {
      magma_demon: 80,
      elite_demon: 20
    }
  }
}

export function getQuestById(id: string): QuestTemplate | undefined {
  return QUESTS[id]
}

// Enemy selection helpers (moved from activities.ts)

export interface FilteredEnemy {
  id: string
  template: EnemyTemplate
  weight: number
}

export function filterEnemiesForSpawn(
  weights: Record<string, number>,
  maxTier: number,
  requiredType?: EnemyType
): FilteredEnemy[] {
  const filtered: FilteredEnemy[] = []

  for (const [enemyId, weight] of Object.entries(weights)) {
    const template = ENEMIES[enemyId]
    if (!template) continue
    if (template.tier > maxTier) continue
    if (requiredType && template.type !== requiredType) continue
    filtered.push({ id: enemyId, template, weight })
  }

  return filtered
}

export function selectEnemyFromPool(pool: FilteredEnemy[]): FilteredEnemy | null {
  if (pool.length === 0) return null

  const totalWeight = pool.reduce((sum, entry) => sum + entry.weight, 0)
  let random = Math.random() * totalWeight

  for (const entry of pool) {
    random -= entry.weight
    if (random <= 0) return entry
  }

  return pool[0]
}

function selectRandomEnemy(weights: Record<string, number>): string {
  const entries = Object.entries(weights)
  const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0)
  let random = Math.random() * totalWeight

  for (const [enemyId, weight] of entries) {
    random -= weight
    if (random <= 0) return enemyId
  }

  return entries[0][0]
}

export function selectEnemyWithFallback(
  weights: Record<string, number>,
  characterTier: number,
  requiredType?: EnemyType
): { enemyId: string; template: EnemyTemplate } | null {
  if (requiredType) {
    const pool = filterEnemiesForSpawn(weights, characterTier, requiredType)
    const selected = selectEnemyFromPool(pool)
    if (selected) return { enemyId: selected.id, template: selected.template }
  }

  const anyTypePool = filterEnemiesForSpawn(weights, characterTier)
  const anySelected = selectEnemyFromPool(anyTypePool)
  if (anySelected) return { enemyId: anySelected.id, template: anySelected.template }

  const enemyId = selectRandomEnemy(weights)
  const template = ENEMIES[enemyId]
  if (template) return { enemyId, template }

  return null
}
