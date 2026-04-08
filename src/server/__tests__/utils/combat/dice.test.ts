import { describe, expect, it } from 'vitest'
import { rollDice, calculateHitsWithCount, getCurrentClassOrThrow } from '../../../utils/combat/dice'
import type { CharacterWithClasses } from '@shared/types/character.types'

describe('dice utilities', () => {
  // ---------- rollDice ----------
  describe('rollDice', () => {
    it('should return the requested number of results', () => {
      expect(rollDice(0)).toHaveLength(0)
      expect(rollDice(1)).toHaveLength(1)
      expect(rollDice(5)).toHaveLength(5)
      expect(rollDice(10)).toHaveLength(10)
    })

    it('should produce values between 1 and 6 inclusive', () => {
      const rolls = rollDice(200)
      for (const roll of rolls) {
        expect(roll).toBeGreaterThanOrEqual(1)
        expect(roll).toBeLessThanOrEqual(6)
      }
    })

    it('should produce all six values in a large sample (statistical)', () => {
      const rolls = rollDice(600)
      const seen = new Set(rolls)
      expect(seen.size).toBe(6)
    })

    it('should produce roughly uniform distribution (statistical)', () => {
      const N = 6000
      const rolls = rollDice(N)
      const counts = [0, 0, 0, 0, 0, 0]
      for (const r of rolls) counts[r - 1]++
      // Each face should appear ~1000 times. Allow 30% tolerance.
      for (const c of counts) {
        expect(c).toBeGreaterThan(N / 6 * 0.7)
        expect(c).toBeLessThan(N / 6 * 1.3)
      }
    })
  })

  // ---------- calculateHitsWithCount ----------
  describe('calculateHitsWithCount', () => {
    it('should count successes at threshold 4', () => {
      const { count, results } = calculateHitsWithCount([1, 2, 3, 4, 5, 6], 4)
      expect(count).toBe(3) // 4, 5, 6
      expect(results.filter((r) => r.isSuccess)).toHaveLength(3)
    })

    it('should mark criticals at default threshold 6', () => {
      const { results } = calculateHitsWithCount([5, 6], 4)
      expect(results[0].isCritical).toBe(false) // 5 < 6
      expect(results[1].isCritical).toBe(true) // 6 >= 6
    })

    it('should mark criticals at custom threshold 5', () => {
      const { results } = calculateHitsWithCount([4, 5, 6], 4, 5)
      expect(results[0].isCritical).toBe(false) // 4 < 5
      expect(results[1].isCritical).toBe(true) // 5 >= 5
      expect(results[2].isCritical).toBe(true) // 6 >= 5
    })

    it('criticals should always count as successes regardless of threshold', () => {
      // threshold 10 means nothing would normally succeed, but 6 is critical at default 6
      const { count, results } = calculateHitsWithCount([6], 10, 6)
      expect(results[0].isCritical).toBe(true)
      expect(results[0].isSuccess).toBe(true)
      expect(count).toBe(1)
    })

    it('should handle guaranteed critical', () => {
      const { results } = calculateHitsWithCount([4, 5], 4, 6, true)
      expect(results[0].isCritical).toBe(true) // guaranteedCritical overrides
      expect(results[1].isCritical).toBe(true)
      // Both should be successes since critical implies success
      expect(results[0].isSuccess).toBe(true)
      expect(results[1].isSuccess).toBe(true)
    })

    it('should return 0 hits for empty rolls', () => {
      const { count, results } = calculateHitsWithCount([], 4)
      expect(count).toBe(0)
      expect(results).toHaveLength(0)
    })

    it('should return 0 hits when all rolls miss', () => {
      const { count } = calculateHitsWithCount([1, 2, 3], 4)
      expect(count).toBe(0)
    })
  })

  // ---------- getCurrentClassOrThrow ----------
  describe('getCurrentClassOrThrow', () => {
    it('should return the matching class', () => {
      const character = {
        currentClass: 'knight',
        classes: [
          { className: 'mage', tier: 1 },
          { className: 'knight', tier: 2 }
        ]
      } as unknown as CharacterWithClasses

      const result = getCurrentClassOrThrow(character)
      expect(result.className).toBe('knight')
    })

    it('should throw when class not found', () => {
      const character = {
        currentClass: 'missing',
        classes: [{ className: 'knight', tier: 1 }]
      } as unknown as CharacterWithClasses

      expect(() => getCurrentClassOrThrow(character)).toThrow('Character class missing not found')
    })
  })
})
