export interface SplitManaInput {
  amount: number
  mana: number
  maxMana: number
  reserve: number
}

export interface SplitManaResult {
  manaApplied: number
  reserveGained: number
  newMana: number
  newReserve: number
}

/**
 * Pure mana-grant distributor. Fills active mana up to maxMana, overflow goes to reserve.
 * Negative `amount` is clamped to 0 (no spending here — Reserve is uncapped on grant only).
 */
export function splitMana({ amount, mana, maxMana, reserve }: SplitManaInput): SplitManaResult {
  const grant = Math.max(0, amount)
  const room = Math.max(0, maxMana - mana)
  const manaApplied = Math.min(grant, room)
  const reserveGained = grant - manaApplied
  return {
    manaApplied,
    reserveGained,
    newMana: mana + manaApplied,
    newReserve: reserve + reserveGained
  }
}
