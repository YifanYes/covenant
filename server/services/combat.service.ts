import { DamageType, EnemyType, getEnemy } from '@shared/constants/enemies'
import { WeaponDamageType } from '@shared/constants/items'
import type { CharacterClassType, CharacterWithClasses } from '@shared/types/character.types'
import type {
  CombatLogEntry,
  CombatTurnResult,
  DiceRollResult,
  EnemyState,
  ResolveCombatParams
} from '@shared/types/gamification.types'
import { CombatLogType } from '@shared/types/gamification.types'
import type { PrismaClient } from '../generated/prisma'

const ENEMY_DICE_BY_TYPE: Record<EnemyType, { defense: number; attack: number }> = {
  [EnemyType.BOSS]: { defense: 3, attack: 4 },
  [EnemyType.ELITE]: { defense: 2, attack: 3 },
  [EnemyType.MINION]: { defense: 1, attack: 2 }
}

/**
 * CombatService provides combat resolution utilities.
 * Note: The old executeAttack method that depended on the Party/Mission system
 * has been removed. Use ActivityService for the new Map Activities combat flow.
 */
export class CombatService {
  // Constructor kept for service factory pattern compatibility
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_prisma: PrismaClient) {}

  rollDice(count: number): number[] {
    const result: number[] = new Array(count)
    for (let i = 0; i < count; i++) {
      result[i] = Math.floor(Math.random() * 6) + 1
    }
    return result
  }

  calculateHitsWithCount(rolls: number[], threshold: number): { results: DiceRollResult[]; count: number } {
    let count = 0
    const results = rolls.map((value) => {
      const isCritical = value === 6
      const isSuccess = isCritical || value >= threshold
      if (isSuccess) count++
      return { value, isSuccess, isCritical }
    })
    return { results, count }
  }

  /**
   * Initialize enemy state from a list of enemy IDs
   */
  initializeEnemyStateFromIds(enemyIds: string[]): EnemyState[] {
    return enemyIds.map((enemyId, index) => {
      const enemy = getEnemy(enemyId)
      return {
        id: `${enemyId}-${index}`,
        enemyId,
        currentHealth: enemy?.health || 3,
        maxHealth: enemy?.health || 3
      }
    })
  }

  getFirstAliveEnemy(enemyState: EnemyState[]): EnemyState | null {
    return enemyState.find((e) => e.currentHealth > 0) || null
  }

  updateEnemyHealth(enemyState: EnemyState[], targetId: string, damage: number): EnemyState[] {
    return enemyState.map((e) =>
      e.id === targetId ? { ...e, currentHealth: Math.max(0, e.currentHealth - damage) } : e
    )
  }

  resolveTurn(params: ResolveCombatParams): CombatTurnResult {
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

    const enemyDice = ENEMY_DICE_BY_TYPE[enemy.type] ?? { defense: 1, attack: 2 }
    const actualDice = attackRolls.length

    // 1. Player attack phase
    const playerThreshold = this.getThreshold(weaponDamageType, playerStrengthAtk, playerMagicAtk)
    const { results: playerAttackRolls, count: playerHits } = this.calculateHitsWithCount(attackRolls, playerThreshold)

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

    // 2. Enemy defense
    const enemyDefThreshold = this.getThreshold(weaponDamageType, enemy.strengthDef, enemy.magicDef)
    const enemyDefenseValues = this.rollDice(enemyDice.defense)
    const { results: enemyDefenseRolls, count: enemyBlocks } = this.calculateHitsWithCount(
      enemyDefenseValues,
      enemyDefThreshold
    )

    logEntries.push({
      timestamp: timestamp + 2,
      type: CombatLogType.ENEMY_DEFENDS,
      data: { blocks: enemyBlocks }
    })

    // 3. Enemy counter-attack
    const enemyAtkThreshold = this.getThreshold(enemy.damageType, enemy.strengthAtk, enemy.magicAtk)
    const enemyAttackValues = this.rollDice(enemyDice.attack)
    const { results: enemyAttackRolls, count: enemyHits } = this.calculateHitsWithCount(
      enemyAttackValues,
      enemyAtkThreshold
    )

    logEntries.push({
      timestamp: timestamp + 3,
      type: CombatLogType.ENEMY_ATTACKS,
      data: { hits: enemyHits }
    })

    // 4. Player defense
    const playerDefThreshold = this.getThreshold(enemy.damageType, playerStrengthDef, playerMagicDef)
    const { results: playerDefenseRolls, count: playerBlocks } = this.calculateHitsWithCount(
      defenseRolls,
      playerDefThreshold
    )

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

  private getThreshold(damageType: WeaponDamageType | DamageType, physical: number, magic: number): number {
    if (damageType === DamageType.BOTH) {
      return Math.max(physical, magic)
    }

    return damageType === WeaponDamageType.PHYSICAL ? physical : magic
  }

  getCurrentClassOrThrow(character: CharacterWithClasses): CharacterClassType {
    const currentClass = character.classes.find((c) => c.className === character.currentClass)
    if (!currentClass) {
      throw new Error(`Character class ${character.currentClass} not found`)
    }

    return currentClass
  }

  getCharacterProgress(character: CharacterWithClasses) {
    const currentClass = character.classes.find((c) => c.className === character.currentClass)
    const tier = currentClass?.tier || 1
    const diceBank = (character.data as any)?.diceBank || 0

    return { tier, diceBank }
  }
}
