import {
  calculateTierFromKills,
  getTierProgress,
  MAX_BETA_TIER,
  TIER_REQUIREMENTS
} from '@shared/constants/tier-progression'
import { describe, expect, it } from 'vitest'

describe('TIER_REQUIREMENTS', () => {
  it('should have tier 2 at 10 kills for beta', () => {
    const tier2 = TIER_REQUIREMENTS.find((r) => r.tier === 2)
    expect(tier2?.killsRequired).toBe(10)
  })

  it('should have tier 3 at 30 kills for beta', () => {
    const tier3 = TIER_REQUIREMENTS.find((r) => r.tier === 3)
    expect(tier3?.killsRequired).toBe(30)
  })

  it('should have max beta tier of 3', () => {
    expect(MAX_BETA_TIER).toBe(3)
  })
})

describe('calculateTierFromKills', () => {
  describe('tier 1 to tier 2 progression', () => {
    it('should remain tier 1 with 0 kills', () => {
      expect(calculateTierFromKills(0, 1)).toBe(1)
    })

    it('should remain tier 1 with 9 kills (just below threshold)', () => {
      expect(calculateTierFromKills(9, 1)).toBe(1)
    })

    it('should progress to tier 2 with exactly 10 kills', () => {
      expect(calculateTierFromKills(10, 1)).toBe(2)
    })

    it('should progress to tier 2 with 11 kills (above threshold)', () => {
      expect(calculateTierFromKills(11, 1)).toBe(2)
    })
  })

  describe('tier 2 to tier 3 progression', () => {
    it('should remain tier 2 with 29 kills (just below threshold)', () => {
      expect(calculateTierFromKills(29, 2)).toBe(2)
    })

    it('should progress to tier 3 with exactly 30 kills', () => {
      expect(calculateTierFromKills(30, 2)).toBe(3)
    })

    it('should progress to tier 3 with 35 kills (above threshold)', () => {
      expect(calculateTierFromKills(35, 2)).toBe(3)
    })
  })

  describe('tier 1 to tier 3 skip (if many kills accumulated)', () => {
    it('should progress directly to tier 3 if kills exceed tier 3 threshold', () => {
      expect(calculateTierFromKills(30, 1)).toBe(3)
    })

    it('should progress directly to tier 3 with 50 kills from tier 1', () => {
      expect(calculateTierFromKills(50, 1)).toBe(3)
    })
  })

  describe('max tier cap', () => {
    it('should stay at tier 3 even with excessive kills', () => {
      expect(calculateTierFromKills(100, 3)).toBe(3)
    })

    it('should stay at tier 3 even with 1000 kills', () => {
      expect(calculateTierFromKills(1000, 3)).toBe(3)
    })
  })

  describe('tier cannot decrease', () => {
    it('should not decrease tier even if kills are somehow lower', () => {
      // Edge case: if somehow a tier 2 player has 5 kills
      // the function should not downgrade them
      expect(calculateTierFromKills(5, 2)).toBe(2)
    })

    it('should not decrease tier 3 even with 0 kills', () => {
      expect(calculateTierFromKills(0, 3)).toBe(3)
    })
  })
})

describe('getTierProgress', () => {
  describe('tier 1 progress toward tier 2', () => {
    it('should show 0% progress with 0 kills', () => {
      const progress = getTierProgress(0, 1)

      expect(progress).not.toBeNull()
      expect(progress?.currentKills).toBe(0)
      expect(progress?.requiredKills).toBe(10)
      expect(progress?.percentage).toBe(0)
      expect(progress?.nextTier).toBe(2)
    })

    it('should show 50% progress with 5 kills', () => {
      const progress = getTierProgress(5, 1)

      expect(progress?.currentKills).toBe(5)
      expect(progress?.percentage).toBe(50)
      expect(progress?.nextTier).toBe(2)
    })

    it('should show 90% progress with 9 kills', () => {
      const progress = getTierProgress(9, 1)

      expect(progress?.percentage).toBe(90)
    })

    it('should show 100% progress with 10 kills', () => {
      const progress = getTierProgress(10, 1)

      expect(progress?.percentage).toBe(100)
    })

    it('should cap percentage at 100 even if over threshold', () => {
      const progress = getTierProgress(15, 1)

      expect(progress?.percentage).toBe(100)
    })
  })

  describe('tier 2 progress toward tier 3', () => {
    it('should show progress toward tier 3 for tier 2 player', () => {
      const progress = getTierProgress(15, 2)

      expect(progress).not.toBeNull()
      expect(progress?.currentKills).toBe(15)
      expect(progress?.requiredKills).toBe(30)
      expect(progress?.percentage).toBe(50)
      expect(progress?.nextTier).toBe(3)
    })

    it('should show 50% progress with 15 kills at tier 2', () => {
      const progress = getTierProgress(15, 2)

      expect(progress?.percentage).toBe(50)
    })

    it('should show 100% progress with 30+ kills at tier 2', () => {
      const progress = getTierProgress(35, 2)

      expect(progress?.percentage).toBe(100)
    })
  })

  describe('max tier reached', () => {
    it('should return null for tier 3 (max tier)', () => {
      const progress = getTierProgress(50, 3)

      expect(progress).toBeNull()
    })

    it('should return null for tier 3 even with 0 kills', () => {
      const progress = getTierProgress(0, 3)

      expect(progress).toBeNull()
    })
  })

  describe('edge cases', () => {
    it('should handle negative kills gracefully', () => {
      const progress = getTierProgress(-5, 1)

      // Note: percentage can be negative with negative kills (not clamped)
      expect(progress?.percentage).toBe(-50)
      expect(progress?.currentKills).toBe(-5)
    })

    it('should return null for tier beyond max', () => {
      const progress = getTierProgress(100, 4)

      expect(progress).toBeNull()
    })
  })
})
