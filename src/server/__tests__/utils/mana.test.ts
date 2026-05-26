import { describe, expect, it } from 'vitest'
import { splitMana } from '../../utils/mana'

describe('splitMana', () => {
  it('fills mana when room is available and there is no overflow', () => {
    expect(splitMana({ amount: 3, mana: 5, maxMana: 10, reserve: 0 })).toEqual({
      manaApplied: 3,
      reserveGained: 0,
      newMana: 8,
      newReserve: 0
    })
  })

  it('overflows to reserve when amount exceeds remaining room', () => {
    expect(splitMana({ amount: 8, mana: 5, maxMana: 10, reserve: 2 })).toEqual({
      manaApplied: 5,
      reserveGained: 3,
      newMana: 10,
      newReserve: 5
    })
  })

  it('routes entirely to reserve when mana is already full', () => {
    expect(splitMana({ amount: 4, mana: 10, maxMana: 10, reserve: 0 })).toEqual({
      manaApplied: 0,
      reserveGained: 4,
      newMana: 10,
      newReserve: 4
    })
  })

  it('exactly fills the bar with no overflow on exact fit', () => {
    expect(splitMana({ amount: 5, mana: 5, maxMana: 10, reserve: 0 })).toEqual({
      manaApplied: 5,
      reserveGained: 0,
      newMana: 10,
      newReserve: 0
    })
  })

  it('returns zero deltas when amount is zero', () => {
    expect(splitMana({ amount: 0, mana: 5, maxMana: 10, reserve: 7 })).toEqual({
      manaApplied: 0,
      reserveGained: 0,
      newMana: 5,
      newReserve: 7
    })
  })

  it('clamps negative amount to zero', () => {
    expect(splitMana({ amount: -3, mana: 5, maxMana: 10, reserve: 0 })).toEqual({
      manaApplied: 0,
      reserveGained: 0,
      newMana: 5,
      newReserve: 0
    })
  })

  it('routes everything to reserve when room is negative (mana > maxMana)', () => {
    expect(splitMana({ amount: 4, mana: 12, maxMana: 10, reserve: 1 })).toEqual({
      manaApplied: 0,
      reserveGained: 4,
      newMana: 12,
      newReserve: 5
    })
  })

  it('handles maxMana of zero by routing all to reserve', () => {
    expect(splitMana({ amount: 5, mana: 0, maxMana: 0, reserve: 0 })).toEqual({
      manaApplied: 0,
      reserveGained: 5,
      newMana: 0,
      newReserve: 5
    })
  })
})
