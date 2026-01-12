import { DamageType, EnemyType, getEnemy } from '@shared/constants/enemies'
import { WeaponDamageType } from '@shared/constants/items'
import { getMission } from '@shared/constants/missions'
import type {
  CombatLogEntry,
  CombatTurnResult,
  DiceRollResult,
  EnemyState,
  ResolveCombatParams
} from '@shared/types/gamification.types'
import { CombatLogType } from '@shared/types/gamification.types'

const ENEMY_DICE_BY_TYPE: Record<EnemyType, { defense: number; attack: number }> = {
  [EnemyType.BOSS]: { defense: 3, attack: 4 },
  [EnemyType.ELITE]: { defense: 2, attack: 3 },
  [EnemyType.MINION]: { defense: 1, attack: 2 }
}

const getThreshold = (damageType: WeaponDamageType | DamageType, physical: number, magic: number): number => {
  if (damageType === DamageType.BOTH) {
    return Math.max(physical, magic)
  }
  return damageType === WeaponDamageType.PHYSICAL ? physical : magic
}

export const rollDice = (count: number): number[] => {
  const result: number[] = new Array(count)
  for (let i = 0; i < count; i++) {
    result[i] = Math.floor(Math.random() * 6) + 1
  }
  return result
}

export const calculateHitsWithCount = (
  rolls: number[],
  threshold: number
): { results: DiceRollResult[]; count: number } => {
  let count = 0

  const results = rolls.map((value) => {
    const isCritical = value === 6
    const isSuccess = isCritical || value >= threshold
    if (isSuccess) count++
    return { value, isSuccess, isCritical }
  })

  return { results, count }
}

export const initializeEnemyState = (missionId: string, phase: number): EnemyState[] => {
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

export const getFirstAliveEnemy = (enemyState: EnemyState[]): EnemyState | null => {
  return enemyState.find((e) => e.currentHealth > 0) || null
}

export const resolveCombatTurn = (params: ResolveCombatParams): CombatTurnResult => {
  const {
    attackRolls,
    defenseRolls,
    targetEnemyId,
    playerStrengthAtk,
    playerStrengthDef,
    playerMagicAtk,
    playerMagicDef,
    playerManaRegen,
    weaponDamageType,
    enemy
  } = params

  const logEntries: CombatLogEntry[] = []
  const timestamp = Date.now()

  // Get enemy dice counts from lookup table
  const enemyDice = ENEMY_DICE_BY_TYPE[enemy.type] ?? { defense: 1, attack: 2 }

  // We trust the provided rolls length is validated by the router
  const actualDice = attackRolls.length

  // 1. Player attack phase
  const playerThreshold = getThreshold(weaponDamageType, playerStrengthAtk, playerMagicAtk)
  // Use provided rolls
  const { results: playerAttackRolls, count: playerHits } = calculateHitsWithCount(attackRolls, playerThreshold)

  logEntries.push({
    timestamp,
    type: CombatLogType.PLAYER_ATTACK,
    data: { dice: actualDice, rolls: attackRolls }
  })

  logEntries.push({
    timestamp: timestamp + 1,
    type: CombatLogType.PLAYER_HITS,
    data: { hits: playerHits }
  })

  // 2. Enemy defense (based on weapon damage type)
  const enemyDefThreshold = getThreshold(weaponDamageType, enemy.strengthDef, enemy.magicDef)
  const enemyDefenseValues = rollDice(enemyDice.defense)
  const { results: enemyDefenseRolls, count: enemyBlocks } = calculateHitsWithCount(
    enemyDefenseValues,
    enemyDefThreshold
  )

  logEntries.push({
    timestamp: timestamp + 2,
    type: CombatLogType.ENEMY_DEFENDS,
    data: { blocks: enemyBlocks }
  })

  // 3. Enemy counter-attack
  const enemyAtkThreshold = getThreshold(enemy.damageType, enemy.strengthAtk, enemy.magicAtk)
  const enemyAttackValues = rollDice(enemyDice.attack)
  const { results: enemyAttackRolls, count: enemyHits } = calculateHitsWithCount(enemyAttackValues, enemyAtkThreshold)

  logEntries.push({
    timestamp: timestamp + 3,
    type: CombatLogType.ENEMY_ATTACKS,
    data: { hits: enemyHits }
  })

  // 4. Player defense (from armor)
  const playerDefThreshold = getThreshold(enemy.damageType, playerStrengthDef, playerMagicDef)
  // Use provided rolls
  const { results: playerDefenseRolls, count: playerBlocks } = calculateHitsWithCount(defenseRolls, playerDefThreshold)

  logEntries.push({
    timestamp: timestamp + 4,
    type: CombatLogType.PLAYER_DEFENDS,
    data: { blocks: playerBlocks, rolls: defenseRolls }
  })

  // 5. Calculate final damage
  const damageToEnemy = Math.max(0, playerHits - enemyBlocks)
  const damageToPlayer = Math.max(0, enemyHits - playerBlocks)

  logEntries.push({
    timestamp: timestamp + 5,
    type: CombatLogType.DAMAGE_TO_ENEMY,
    data: { enemy: enemy.name, damage: damageToEnemy }
  })

  if (damageToPlayer > 0) {
    logEntries.push({
      timestamp: timestamp + 6,
      type: CombatLogType.DAMAGE_TO_PLAYER,
      data: { damage: damageToPlayer }
    })
  }

  // Mana regeneration
  logEntries.push({
    timestamp: timestamp + 7,
    type: CombatLogType.MANA_REGEN,
    data: { mana: playerManaRegen }
  })

  return {
    playerAttackRolls,
    enemyDefenseRolls,
    enemyAttackRolls,
    playerDefenseRolls,
    playerHits,
    enemyBlocks,
    enemyHits,
    playerBlocks,
    damageToEnemy,
    damageToPlayer,
    manaRegenerated: playerManaRegen,
    targetEnemyId,
    logEntries
  }
}
