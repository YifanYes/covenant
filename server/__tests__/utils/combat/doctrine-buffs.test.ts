import { describe, expect, it } from 'vitest'
import {
  getActiveDoctrineBuffs,
  clearConsumedDoctrines,
  clearConsumedDefenseDoctrines
} from '../../../utils/combat/doctrine-buffs'
import { StatusEffect, type ActiveStatusEffect } from '@shared/types/doctrine.types'

// ---------- helpers ----------
const makeDoctrineEffect = (
  doctrineId: string,
  remainingTurns: number = 1
): ActiveStatusEffect => ({
  effect: StatusEffect.DOCTRINE_ACTIVE,
  remainingTurns,
  sourceDoctrineId: doctrineId
})

describe('doctrine-buffs utilities', () => {
  // ---------- getActiveDoctrineBuffs ----------
  describe('getActiveDoctrineBuffs', () => {
    it('should return zeroed buffs for undefined doctrines', () => {
      const buffs = getActiveDoctrineBuffs(undefined)
      expect(buffs.bonusDice).toBe(0)
      expect(buffs.thresholdMod).toBe(0)
      expect(buffs.negateHits).toBe(0)
      expect(buffs.guaranteedCritical).toBe(false)
      expect(buffs.criticalThresholdMod).toBe(0)
      expect(buffs.sixesGenerateExtraHits).toBe(false)
      expect(buffs.defenseZero).toBe(false)
      expect(buffs.onesHurtSelf).toBe(false)
      expect(buffs.thornsDamage).toBe(0)
    })

    it('should return zeroed buffs for empty doctrines', () => {
      const buffs = getActiveDoctrineBuffs({})
      expect(buffs.bonusDice).toBe(0)
    })

    it('should detect POWER_MODIFIER (shoulder_charge: +1 dice)', () => {
      const doctrines = { shoulder_charge: makeDoctrineEffect('shoulder_charge') }
      const buffs = getActiveDoctrineBuffs(doctrines)
      expect(buffs.bonusDice).toBe(1)
    })

    it('should detect THRESHOLD_MODIFIER (kings_sword: -2)', () => {
      const doctrines = { kings_sword: makeDoctrineEffect('kings_sword') }
      const buffs = getActiveDoctrineBuffs(doctrines)
      expect(buffs.thresholdMod).toBe(-2)
    })

    it('should detect THRESHOLD_MODIFIER (light_shield: -1)', () => {
      const doctrines = { light_shield: makeDoctrineEffect('light_shield') }
      const buffs = getActiveDoctrineBuffs(doctrines)
      expect(buffs.thresholdMod).toBe(-1)
    })

    it('should detect NEGATE_HITS flat (miraculous_protection: 1)', () => {
      const doctrines = { miraculous_protection: makeDoctrineEffect('miraculous_protection') }
      const buffs = getActiveDoctrineBuffs(doctrines)
      expect(buffs.negateHits).toBe(1)
    })

    it('should detect NEGATE_HITS large (iron_bastion: 99) as flat when no incomingHits', () => {
      const doctrines = { iron_bastion: makeDoctrineEffect('iron_bastion') }
      const buffs = getActiveDoctrineBuffs(doctrines)
      expect(buffs.negateHits).toBe(99)
    })

    it('should compute percentage NEGATE_HITS when incomingHits provided', () => {
      const doctrines = { iron_bastion: makeDoctrineEffect('iron_bastion') }
      // 99% of 4 incoming hits = ceil(3.96) = 4
      const buffs = getActiveDoctrineBuffs(doctrines, 4)
      expect(buffs.negateHits).toBe(4)
    })

    it('should detect GUARANTEED_CRITICAL value=1 (wrath_avatar)', () => {
      const doctrines = { wrath_avatar: makeDoctrineEffect('wrath_avatar') }
      const buffs = getActiveDoctrineBuffs(doctrines)
      expect(buffs.guaranteedCritical).toBe(true)
    })

    it('should detect GUARANTEED_CRITICAL value=5 (precise_strike) as criticalThresholdMod', () => {
      const doctrines = { precise_strike: makeDoctrineEffect('precise_strike') }
      const buffs = getActiveDoctrineBuffs(doctrines)
      expect(buffs.guaranteedCritical).toBe(false)
      expect(buffs.criticalThresholdMod).toBe(1) // 6 - 5
    })

    it('should set defenseZero for reckless_strike', () => {
      const doctrines = { reckless_strike: makeDoctrineEffect('reckless_strike') }
      const buffs = getActiveDoctrineBuffs(doctrines)
      expect(buffs.defenseZero).toBe(true)
    })

    it('should set onesHurtSelf for audacity', () => {
      const doctrines = { audacity: makeDoctrineEffect('audacity') }
      const buffs = getActiveDoctrineBuffs(doctrines)
      expect(buffs.onesHurtSelf).toBe(true)
      expect(buffs.defenseZero).toBe(true) // audacity also sets defenseZero
    })

    it('should ignore expired doctrines (remainingTurns <= 0)', () => {
      const doctrines = { shoulder_charge: makeDoctrineEffect('shoulder_charge', 0) }
      const buffs = getActiveDoctrineBuffs(doctrines)
      expect(buffs.bonusDice).toBe(0)
    })

    it('should combine multiple doctrines', () => {
      const doctrines = {
        shoulder_charge: makeDoctrineEffect('shoulder_charge'), // +1 dice
        miraculous_protection: makeDoctrineEffect('miraculous_protection') // negate 1
      }
      const buffs = getActiveDoctrineBuffs(doctrines)
      expect(buffs.bonusDice).toBe(1)
      expect(buffs.negateHits).toBe(1)
    })

    it('should handle inspiration with pre-calculated bonus', () => {
      const doctrines: Record<string, any> = {
        inspiration: makeDoctrineEffect('inspiration'),
        inspiration_bonus: { ...makeDoctrineEffect('inspiration'), calculatedBonusDice: 6 }
      }
      const buffs = getActiveDoctrineBuffs(doctrines)
      expect(buffs.bonusDice).toBe(6)
    })
  })

  // ---------- clearConsumedDoctrines ----------
  describe('clearConsumedDoctrines', () => {
    it('should return empty object for undefined input', () => {
      expect(clearConsumedDoctrines(undefined)).toEqual({})
    })

    it('should clear single-turn POWER_MODIFIER buffs', () => {
      const doctrines = { shoulder_charge: makeDoctrineEffect('shoulder_charge', 1) }
      const result = clearConsumedDoctrines(doctrines)
      expect(result.shoulder_charge).toBeUndefined()
    })

    it('should decrement multi-turn attack buffs instead of removing', () => {
      const doctrines = { shoulder_charge: makeDoctrineEffect('shoulder_charge', 3) }
      const result = clearConsumedDoctrines(doctrines)
      expect(result.shoulder_charge).toBeDefined()
      expect(result.shoulder_charge.remainingTurns).toBe(2)
    })

    it('should clear THRESHOLD_MODIFIER buffs', () => {
      const doctrines = { light_shield: makeDoctrineEffect('light_shield', 1) }
      const result = clearConsumedDoctrines(doctrines)
      expect(result.light_shield).toBeUndefined()
    })

    it('should clear GUARANTEED_CRITICAL buffs', () => {
      const doctrines = { precise_strike: makeDoctrineEffect('precise_strike', 1) }
      const result = clearConsumedDoctrines(doctrines)
      expect(result.precise_strike).toBeUndefined()
    })

    it('should preserve NEGATE_HITS buffs by default (not clearDefenseBuffs)', () => {
      const doctrines = { miraculous_protection: makeDoctrineEffect('miraculous_protection', 1) }
      const result = clearConsumedDoctrines(doctrines)
      expect(result.miraculous_protection).toBeDefined()
    })

    it('should clear NEGATE_HITS when clearDefenseBuffs=true', () => {
      const doctrines = { miraculous_protection: makeDoctrineEffect('miraculous_protection', 1) }
      const result = clearConsumedDoctrines(doctrines, true)
      expect(result.miraculous_protection).toBeUndefined()
    })

    it('should preserve unknown doctrine effects with remaining turns', () => {
      const doctrines = {
        unknown_effect: {
          effect: StatusEffect.BURNING,
          remainingTurns: 2,
          sourceDoctrineId: 'unknown_source'
        } as ActiveStatusEffect
      }
      const result = clearConsumedDoctrines(doctrines)
      expect(result.unknown_effect).toBeDefined()
    })

    it('should drop expired unknown doctrine effects', () => {
      const doctrines = {
        unknown_effect: {
          effect: StatusEffect.BURNING,
          remainingTurns: 0,
          sourceDoctrineId: 'unknown_source'
        } as ActiveStatusEffect
      }
      const result = clearConsumedDoctrines(doctrines)
      expect(result.unknown_effect).toBeUndefined()
    })
  })

  // ---------- clearConsumedDefenseDoctrines ----------
  describe('clearConsumedDefenseDoctrines', () => {
    it('should clear both attack and defense buffs', () => {
      const doctrines = {
        shoulder_charge: makeDoctrineEffect('shoulder_charge', 1),
        miraculous_protection: makeDoctrineEffect('miraculous_protection', 1)
      }
      const result = clearConsumedDefenseDoctrines(doctrines)
      expect(result.shoulder_charge).toBeUndefined()
      expect(result.miraculous_protection).toBeUndefined()
    })
  })

})
