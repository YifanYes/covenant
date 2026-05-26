import { expect } from 'vitest'
import type { ManaGrantResult } from '../../services/mana.service'

/**
 * Asserts every field of a ManaGrantResult against `expected`. `success` defaults to true.
 * Use to shrink 6-line `expect(result.X).toBe(...)` blocks to a single call.
 */
export function expectManaGrant(result: ManaGrantResult, expected: Partial<ManaGrantResult>): void {
  expect(result).toEqual({
    success: true,
    amount: 0,
    manaApplied: 0,
    reserveGained: 0,
    newMana: 0,
    newReserve: 0,
    ...expected
  })
}
