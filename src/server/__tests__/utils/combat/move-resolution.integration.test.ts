import type { TacticalStateData, TacticalUnitState } from '@shared/types/tactical-combat.types'
import { StatusEffect } from '@shared/types/ability.types'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { executeEnemyMove, executeMove } from '../../../utils/combat/move-resolution'

// Integration tests for move-resolution side effects that need full repo wiring:
//   1. potionUsedThisTurn reset at the end of enemy turn.
//   2. DOT-kill in executeEnemyMove triggers processEnemyDefeat (next enemy + gold).

const playerUnit = (override: Partial<TacticalUnitState> = {}): TacticalUnitState => ({
  id: 'player-1',
  name: 'Hero',
  currentHealth: 40,
  maxHealth: 40,
  currentMana: 5,
  maxMana: 5,
  speed: 1,
  strengthAtk: 4,
  strengthDef: 4,
  magicAtk: 5,
  magicDef: 5,
  tier: 1,
  ...override
})

const enemyUnit = (override: Partial<TacticalUnitState> = {}): TacticalUnitState => ({
  id: 'enemy-1',
  name: 'Shadow Demon',
  templateId: 'shadow_demon',
  currentHealth: 30,
  maxHealth: 30,
  currentMana: 5,
  maxMana: 5,
  speed: 1,
  strengthAtk: 5,
  strengthDef: 4,
  magicAtk: 3,
  magicDef: 3,
  tier: 1,
  moves: ['basic_strike'],
  ...override
})

function makeRepos(initialState: TacticalStateData) {
  const stateRef = { current: initialState }

  const characterQuestRepository = {
    findByIdWithTacticalState: vi.fn(async () => ({
      id: 'quest-1',
      characterId: 'char-1',
      tacticalState: stateRef.current
    })),
    updateTacticalState: vi.fn(async (_id: string, next: TacticalStateData) => {
      stateRef.current = next
    }),
    findById: vi.fn(async () => ({
      id: 'quest-1',
      characterId: 'char-1',
      questId: 'patrol_north_gate',
      status: 'ACTIVE',
      progress: 0,
      target: 5,
      goldEarned: 0
    })),
    getCombatStats: vi.fn(async () => null),
    updateCombatStats: vi.fn(async () => {}),
    updateProgress: vi.fn(async () => {}),
    complete: vi.fn(async () => {})
  }

  const characterRepository = {
    findByIdWithClasses: vi.fn(async () => ({
      id: 'char-1',
      currentClass: 'templar',
      classes: [
        {
          id: 'class-1',
          className: 'templar',
          health: 40,
          maxHealth: 40,
          mana: 5,
          maxMana: 5,
          speed: 1,
          tier: 1,
          strengthAtk: 4,
          strengthDef: 4,
          magicAtk: 5,
          magicDef: 5,
          manaRegen: 1,
          equippedAbilities: []
        }
      ]
    })),
    updateHealth: vi.fn(async () => {}),
    addGold: vi.fn(async () => {})
  }

  const combatEnemyRepository = {
    getActiveEnemy: vi.fn(async () => ({
      id: 'enemy-1',
      templateId: 'shadow_demon',
      status: 'ACTIVE',
      currentHealth: 30,
      maxHealth: 30
    })),
    findById: vi.fn(),
    updateEnemy: vi.fn(async () => {}),
    defeatEnemy: vi.fn(async () => {}),
    appendToCombatLog: vi.fn(async () => {}),
    createEnemy: vi.fn(async () => ({ id: 'enemy-2' }))
  }

  return {
    stateRef,
    repos: {
      characterRepository: characterRepository as never,
      characterQuestRepository: characterQuestRepository as never,
      combatEnemyRepository: combatEnemyRepository as never
    },
    mocks: { characterQuestRepository, characterRepository, combatEnemyRepository }
  }
}

describe('executeMove — potionUsedThisTurn reset', () => {
  beforeEach(() => vi.clearAllMocks())

  it('clears potionUsedThisTurn when an enemy completes its turn', async () => {
    const initial: TacticalStateData = {
      units: [playerUnit(), enemyUnit()],
      turnOrder: ['player-1', 'enemy-1'],
      currentTurnIndex: 1,
      potionUsedThisTurn: true
    }
    const { stateRef, repos, mocks } = makeRepos(initial)

    await executeMove({
      participationId: BigInt(1),
      casterId: 'enemy-1',
      moveId: 'basic_strike',
      targetIds: ['player-1'],
      casterMana: 5,
      repos
    })

    expect(mocks.characterQuestRepository.updateTacticalState).toHaveBeenCalled()
    expect(stateRef.current.potionUsedThisTurn).toBe(false)
  })

  it('leaves potionUsedThisTurn alone on a player-cast move', async () => {
    const initial: TacticalStateData = {
      units: [playerUnit(), enemyUnit()],
      turnOrder: ['player-1', 'enemy-1'],
      currentTurnIndex: 0,
      potionUsedThisTurn: true
    }
    const { stateRef, repos } = makeRepos(initial)

    await executeMove({
      participationId: BigInt(1),
      casterId: 'player-1',
      moveId: 'basic_strike',
      targetIds: ['enemy-1'],
      casterMana: 5,
      repos
    })

    expect(stateRef.current.potionUsedThisTurn).toBe(true)
  })
})

describe('executeEnemyMove — mana drain + AI selection', () => {
  beforeEach(() => vi.clearAllMocks())

  it('decrements caster currentMana on the tactical unit after a move', async () => {
    const initial: TacticalStateData = {
      units: [
        playerUnit(),
        enemyUnit({ currentMana: 6, maxMana: 6, moves: ['plasma_missile', 'basic_strike'] })
      ],
      turnOrder: ['player-1', 'enemy-1'],
      currentTurnIndex: 1
    }
    const { stateRef, repos } = makeRepos(initial)

    await executeEnemyMove({ participationId: BigInt(1), enemyId: 'enemy-1', repos })

    const enemy = stateRef.current.units.find((u) => u.id === 'enemy-1')!
    // plasma_missile costs 3; enemy starts at 6 → expect 3 left.
    expect(enemy.currentMana).toBe(3)
  })

  it('falls back to basic_strike once mana is exhausted across turns', async () => {
    // 3 mana, plasma_missile costs 3 — first turn casts plasma, second turn must
    // pick basic_strike (the only affordable move at 0 mana).
    const initial: TacticalStateData = {
      units: [
        playerUnit(),
        enemyUnit({ currentMana: 3, maxMana: 3, moves: ['plasma_missile', 'basic_strike'] })
      ],
      turnOrder: ['player-1', 'enemy-1'],
      currentTurnIndex: 1
    }
    const { stateRef, repos } = makeRepos(initial)

    const first = await executeEnemyMove({ participationId: BigInt(1), enemyId: 'enemy-1', repos })
    expect(first.moveId).toBe('plasma_missile')
    expect(stateRef.current.units.find((u) => u.id === 'enemy-1')!.currentMana).toBe(0)

    // Rewind turn pointer so the second call resolves cleanly.
    stateRef.current = {
      ...stateRef.current,
      turnOrder: ['player-1', 'enemy-1'],
      currentTurnIndex: 1
    }

    const second = await executeEnemyMove({ participationId: BigInt(1), enemyId: 'enemy-1', repos })
    expect(second.moveId).toBe('basic_strike')
  })

  it('logs an enemy-cast move as ENEMY_ATTACKS, not PLAYER_ATTACK', async () => {
    const initial: TacticalStateData = {
      units: [playerUnit(), enemyUnit({ moves: ['basic_strike'] })],
      turnOrder: ['player-1', 'enemy-1'],
      currentTurnIndex: 1
    }
    const { repos } = makeRepos(initial)

    const result = await executeEnemyMove({ participationId: BigInt(1), enemyId: 'enemy-1', repos })

    const opener = result.logEntries[0]
    expect(opener.type).toBe('ENEMY_ATTACKS')
  })
})

describe('executeEnemyMove — DOT-kill spawn', () => {
  beforeEach(() => vi.clearAllMocks())

  it('runs processEnemyDefeat when start-of-turn DOT kills the enemy', async () => {
    const initial: TacticalStateData = {
      units: [
        playerUnit(),
        enemyUnit({
          currentHealth: 5,
          activeEffects: [
            {
              effect: StatusEffect.PURIFIED,
              remainingTurns: 2,
              sourceAbilityId: 'truth_blade'
            }
          ]
        })
      ],
      turnOrder: ['player-1', 'enemy-1'],
      currentTurnIndex: 1
    }
    const { stateRef, repos, mocks } = makeRepos(initial)

    const result = await executeEnemyMove({
      participationId: BigInt(1),
      enemyId: 'enemy-1',
      repos
    })

    expect(result.effects[0]).toMatchObject({ unitId: 'enemy-1', damageDealt: 5, killed: true })
    expect(mocks.combatEnemyRepository.defeatEnemy).toHaveBeenCalledWith('enemy-1')
    expect(mocks.characterQuestRepository.updateProgress).toHaveBeenCalled()
    // Dead enemy filtered out of state before next-enemy spawn is written.
    expect(stateRef.current.units.some((u) => u.id === 'enemy-1' && u.currentHealth === 0)).toBe(false)
  })

  it('keeps the legacy no-spawn behavior when no combatEnemyRepository is wired', async () => {
    const initial: TacticalStateData = {
      units: [
        playerUnit(),
        enemyUnit({
          currentHealth: 5,
          activeEffects: [
            { effect: StatusEffect.POISONED, remainingTurns: 1, sourceAbilityId: 'x' }
          ]
        })
      ],
      turnOrder: ['player-1', 'enemy-1'],
      currentTurnIndex: 1
    }
    const { repos } = makeRepos(initial)
    const reposNoEnemyRepo = { ...repos, combatEnemyRepository: undefined }

    const result = await executeEnemyMove({
      participationId: BigInt(1),
      enemyId: 'enemy-1',
      repos: reposNoEnemyRepo as never
    })

    expect(result.effects[0]).toMatchObject({ killed: true })
    expect(result.nextEnemy).toBeUndefined()
    expect(result.goldReward).toBeUndefined()
  })
})
