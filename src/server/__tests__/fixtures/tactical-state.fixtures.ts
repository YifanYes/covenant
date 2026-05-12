import type { TacticalStateData, TacticalUnitState } from '@shared/types/tactical-combat.types'

export function createTestUnit(overrides: Partial<TacticalUnitState> & { id: string }): TacticalUnitState {
  return {
    name: overrides.id,
    currentHealth: 10,
    maxHealth: 10,
    currentMana: 0,
    maxMana: 0,
    speed: 1,
    strengthAtk: 5,
    strengthDef: 5,
    magicAtk: 5,
    magicDef: 5,
    ...overrides
  }
}

export function createTestTacticalState(overrides?: Partial<TacticalStateData>): TacticalStateData {
  const units = overrides?.units ?? [createTestUnit({ id: 'player-1' }), createTestUnit({ id: 'enemy-1' })]

  return {
    units,
    turnOrder: units.map((u) => u.id),
    currentTurnIndex: 0,
    ...overrides,
    ...(overrides?.units ? {} : { units })
  }
}
