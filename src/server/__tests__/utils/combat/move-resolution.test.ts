import { describe, expect, it } from 'vitest'
import {
  computeDamage,
  rollVariance,
  unitLevel,
  VARIANCE_MIN,
  VARIANCE_RANGE
} from '../../../utils/combat/combat-formula'

describe('combat-formula', () => {
  describe('unitLevel', () => {
    it('maps tier to Pokémon-style level', () => {
      expect(unitLevel(1)).toBe(20)
      expect(unitLevel(2)).toBe(30)
      expect(unitLevel(3)).toBe(40)
      expect(unitLevel(4)).toBe(50)
    })
  })

  describe('rollVariance', () => {
    it('stays within ±15% bound', () => {
      for (let i = 0; i < 500; i++) {
        const v = rollVariance()
        expect(v).toBeGreaterThanOrEqual(VARIANCE_MIN)
        expect(v).toBeLessThan(VARIANCE_MIN + VARIANCE_RANGE + 1e-9)
      }
    })
  })

  describe('computeDamage', () => {
    it('produces positive damage for sensible inputs', () => {
      const dmg = computeDamage({ level: 20, power: 50, atk: 8, def: 5, variance: 1, isCrit: false })
      expect(dmg).toBeGreaterThan(0)
    })

    it('doubles damage on crit', () => {
      const base = computeDamage({ level: 20, power: 50, atk: 8, def: 5, variance: 1, isCrit: false })
      const crit = computeDamage({ level: 20, power: 50, atk: 8, def: 5, variance: 1, isCrit: true })
      // Allow some floor() jitter (formula floors the inner base before multiplying)
      expect(crit).toBeGreaterThanOrEqual(base * 2 - 1)
      expect(crit).toBeLessThanOrEqual(base * 2 + 1)
    })

    it('floors defender DEF at 1 to avoid divide-by-zero', () => {
      const dmgWithZero = computeDamage({ level: 20, power: 50, atk: 8, def: 0, variance: 1, isCrit: false })
      const dmgWithOne = computeDamage({ level: 20, power: 50, atk: 8, def: 1, variance: 1, isCrit: false })
      expect(dmgWithZero).toBe(dmgWithOne)
    })

    it('scales with level', () => {
      const t1 = computeDamage({ level: 20, power: 50, atk: 8, def: 5, variance: 1, isCrit: false })
      const t3 = computeDamage({ level: 40, power: 50, atk: 8, def: 5, variance: 1, isCrit: false })
      expect(t3).toBeGreaterThan(t1)
    })
  })
})
