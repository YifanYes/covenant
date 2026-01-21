import { DamageType, type EnemyTemplate, EnemyType, getEnemy } from '@shared/constants/enemies'
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

export class CombatService {
  constructor(_prisma: PrismaClient) {}

  private _resolvePlayerAttack(
    attackRolls: number[],
    weaponDamageType: WeaponDamageType,
    strengthAtk: number,
    magicAtk: number
  ) {
    const threshold = this.getThreshold(weaponDamageType, strengthAtk, magicAtk)
    const { results: playerAttackRolls, count: playerHits } = this.calculateHitsWithCount(attackRolls, threshold)
    return { playerHits, playerAttackRolls }
  }

  private _resolveEnemyDefense(enemy: EnemyTemplate, weaponDamageType: WeaponDamageType) {
    const enemyDice = ENEMY_DICE_BY_TYPE[enemy.type] ?? { defense: 1, attack: 2 }
    const threshold = this.getThreshold(weaponDamageType, enemy.strengthDef, enemy.magicDef)

    const enemyDefenseValues = this.rollDice(enemyDice.defense)
    const { results: enemyDefenseRolls, count: enemyBlocks } = this.calculateHitsWithCount(
      enemyDefenseValues,
      threshold
    )
    return { enemyBlocks, enemyDefenseRolls }
  }

  private _resolveEnemyAttack(enemy: EnemyTemplate) {
    const enemyDice = ENEMY_DICE_BY_TYPE[enemy.type] ?? { defense: 1, attack: 2 }
    const threshold = this.getThreshold(enemy.damageType, enemy.strengthAtk, enemy.magicAtk)

    const enemyAttackValues = this.rollDice(enemyDice.attack)
    const { results: enemyAttackRolls, count: enemyHits } = this.calculateHitsWithCount(enemyAttackValues, threshold)
    return { enemyHits, enemyAttackRolls }
  }

  private _resolvePlayerDefense(defenseRolls: number[], enemy: EnemyTemplate, strengthDef: number, magicDef: number) {
    const threshold = this.getThreshold(enemy.damageType, strengthDef, magicDef)
    const { results: playerDefenseRolls, count: playerBlocks } = this.calculateHitsWithCount(defenseRolls, threshold)
    return { playerBlocks, playerDefenseRolls }
  }

  private getThreshold(damageType: WeaponDamageType | DamageType, physical: number, magic: number): number {
    if (damageType === DamageType.BOTH) {
      return Math.max(physical, magic)
    }
    return damageType === WeaponDamageType.PHYSICAL ? physical : magic
  }

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

    const timestamp = Date.now()
    const logEntries: CombatLogEntry[] = []

    // 1. Initial Logging
    logEntries.push({
      timestamp,
      type: CombatLogType.PLAYER_ATTACK,
      data: { dice: attackRolls.length, rolls: attackRolls }
    })

    // 2. Resolve Player Attack
    const { playerHits, playerAttackRolls } = this._resolvePlayerAttack(
      attackRolls,
      weaponDamageType,
      playerStrengthAtk,
      playerMagicAtk
    )
    logEntries.push({
      timestamp: timestamp + 1,
      type: CombatLogType.PLAYER_HITS,
      data: { hits: playerHits }
    })

    // 3. Resolve Enemy Defense
    const { enemyBlocks, enemyDefenseRolls } = this._resolveEnemyDefense(enemy, weaponDamageType)
    logEntries.push({
      timestamp: timestamp + 2,
      type: CombatLogType.ENEMY_DEFENDS,
      data: { blocks: enemyBlocks }
    })

    // 4. Resolve Enemy Attack
    const { enemyHits, enemyAttackRolls } = this._resolveEnemyAttack(enemy)
    logEntries.push({
      timestamp: timestamp + 3,
      type: CombatLogType.ENEMY_ATTACKS,
      data: { hits: enemyHits }
    })

    // 5. Resolve Player Defense
    const { playerBlocks, playerDefenseRolls } = this._resolvePlayerDefense(
      defenseRolls,
      enemy,
      playerStrengthDef,
      playerMagicDef
    )
    logEntries.push({
      timestamp: timestamp + 4,
      type: CombatLogType.PLAYER_DEFENDS,
      data: { blocks: playerBlocks, rolls: defenseRolls }
    })

    // 6. Calculate Final Damage
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
