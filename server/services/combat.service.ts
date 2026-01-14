import { DamageType, EnemyType, getEnemy } from '@shared/constants/enemies'
import { WeaponDamageType } from '@shared/constants/items'
import { getMission } from '@shared/constants/missions'
import { AttackType } from '@shared/schemas/missions.schemas'
import { CharacterWithClassesAndParty } from '@shared/types/character.types'
import type { AttackResult } from '@shared/types/combat.types'
import type {
  CombatLogEntry,
  CombatTurnResult,
  DiceRollResult,
  EnemyState,
  ResolveCombatParams
} from '@shared/types/gamification.types'
import { CombatLogType, ItemType, MissionStatus } from '@shared/types/gamification.types'
import { TRPCError } from '@trpc/server'
import type { PrismaClient } from '../generated/prisma'
import { CharacterRepository } from '../repositories/character.repository'
import { CombatRepository } from '../repositories/combat.repository'
import { MissionRepository } from '../repositories/mission.repository'
import { PartyRepository } from '../repositories/party.repository'

const ENEMY_DICE_BY_TYPE: Record<EnemyType, { defense: number; attack: number }> = {
  [EnemyType.BOSS]: { defense: 3, attack: 4 },
  [EnemyType.ELITE]: { defense: 2, attack: 3 },
  [EnemyType.MINION]: { defense: 1, attack: 2 }
}

export class CombatService {
  private characterRepository: CharacterRepository
  private missionRepository: MissionRepository
  private partyRepository: PartyRepository
  private combatRepository: CombatRepository

  constructor(private prisma: PrismaClient) {
    this.characterRepository = new CharacterRepository(prisma)
    this.missionRepository = new MissionRepository(prisma)
    this.partyRepository = new PartyRepository(prisma)
    this.combatRepository = new CombatRepository(prisma)
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

  initializeEnemyState(missionId: string, phase: number): EnemyState[] {
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

  async executeAttack(userId: string, params: AttackType): Promise<AttackResult> {
    // 1. Load character with party and classes
    const character = await this.characterRepository.findWithClassesAndPartyOrThrow(userId)

    if (!character.party.currentMissionId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'No active mission' })
    }

    // 2. Get mission and current class
    const mission = await this.missionRepository.findActiveOrThrow(character.party.currentMissionId)
    const currentClass = this.getCurrentClassOrThrow(character)
    const { tier, diceBank } = this.getCharacterProgress(character)

    const diceCost = params.attackRolls.length + params.defenseRolls.length

    // 3. Validate dice availability
    if (diceBank < diceCost) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Not enough dice' })
    }

    // 4. Get enemy state and find target
    const enemyState = (mission.enemyState as unknown as EnemyState[]) || []
    const targetEnemy = this.getFirstAliveEnemy(enemyState)

    if (!targetEnemy) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'No enemies to attack' })
    }

    const enemyTemplate = getEnemy(targetEnemy.enemyId)
    if (!enemyTemplate) {
      throw new TRPCError({ code: 'NOT_FOUND', message: `Enemy template ${targetEnemy.enemyId} not found` })
    }

    // 5. Determine weapon damage type
    const loadout = (character.loadout as any[]) || []
    const weapon = loadout.find((item) => item.type?.startsWith('WEAPON_'))
    const weaponDamageType: WeaponDamageType =
      weapon?.type === ItemType.WEAPON_MAGIC ? WeaponDamageType.MAGIC : WeaponDamageType.PHYSICAL

    // 6. Resolve combat turn
    const result = this.resolveTurn({
      attackRolls: params.attackRolls,
      defenseRolls: params.defenseRolls,
      targetEnemyId: targetEnemy.id,
      playerStrengthAtk: currentClass.strengthAtk,
      playerStrengthDef: currentClass.strengthDef,
      playerMagicAtk: currentClass.magicAtk,
      playerMagicDef: currentClass.magicDef,
      playerManaRegen: currentClass.manaRegen,
      weaponDamageType,
      enemy: enemyTemplate,
      tier
    })

    // 7. Update enemy state
    const updatedEnemyState = this.updateEnemyHealth(enemyState, targetEnemy.id, result.damageToEnemy)

    // Check if enemy was defeated
    const updatedTarget = updatedEnemyState.find((e) => e.id === targetEnemy.id)
    if (updatedTarget && updatedTarget.currentHealth <= 0) {
      result.logEntries.push({
        timestamp: Date.now(),
        type: CombatLogType.ENEMY_DEFEATED,
        data: { enemy: enemyTemplate.name }
      })
    }

    // 8. Update combat log
    const existingLog = (mission.combatLog as unknown as CombatLogEntry[]) || []
    const updatedLog = [...result.logEntries.reverse(), ...existingLog]

    // 9. Calculate new values
    const characterData = (character.data as any) || {}
    const newDiceBank = Math.max(0, diceBank - diceCost)
    const newHealth = Math.max(0, currentClass.health - result.damageToPlayer)
    const newMana = Math.min(currentClass.maxMana, currentClass.mana + result.manaRegenerated)
    const characterDead = newHealth <= 0

    // 10. Save all updates via Repository
    await this.combatRepository.saveTurnResults(mission.id, character.id, currentClass.id, {
      enemyState: updatedEnemyState,
      combatLog: updatedLog,
      missionStatus: characterDead ? MissionStatus.FAILED : undefined,
      missionCompletedAt: characterDead ? new Date() : undefined,
      characterData,
      diceBank: newDiceBank,
      health: newHealth,
      mana: newMana
    })

    // 11. Clear party mission if character died
    if (characterDead) {
      await this.partyRepository.setCurrentMission(character.party.id, null)
    }

    // 12. Check if all enemies defeated
    const allDefeated = updatedEnemyState.every((e) => e.currentHealth <= 0)

    return {
      ...result,
      updatedEnemyState,
      allEnemiesDefeated: allDefeated,
      newDiceBank,
      characterDead
    }
  }

  private getThreshold(damageType: WeaponDamageType | DamageType, physical: number, magic: number): number {
    if (damageType === DamageType.BOTH) {
      return Math.max(physical, magic)
    }

    return damageType === WeaponDamageType.PHYSICAL ? physical : magic
  }

  private getCurrentClassOrThrow(character: CharacterWithClassesAndParty) {
    const currentClass = character.classes.find((c) => c.className === character.currentClass)
    if (!currentClass) {
      throw new TRPCError({ code: 'NOT_FOUND', message: `Character class ${character.currentClass} not found` })
    }

    return currentClass
  }

  private getCharacterProgress(character: CharacterWithClassesAndParty) {
    const currentClass = character.classes.find((c) => c.className === character.currentClass)
    const tier = currentClass?.tier || 1
    const diceBank = (character.data as any)?.diceBank || 0

    return { tier, diceBank }
  }
}
