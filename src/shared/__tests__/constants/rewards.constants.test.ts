import { describe, expect, it } from 'vitest'
import { getManaForSource, getTaskMana, MANA_REWARDS } from '../../constants/rewards.constants'

describe('getTaskMana', () => {
  it('returns HIGH reward for HIGH impact', () => {
    expect(getTaskMana('HIGH')).toBe(MANA_REWARDS.TASK_HIGH_IMPACT)
  })

  it('returns MID reward for MEDIUM impact', () => {
    expect(getTaskMana('MEDIUM')).toBe(MANA_REWARDS.TASK_MID_IMPACT)
  })

  it('returns LOW reward for LOW impact', () => {
    expect(getTaskMana('LOW')).toBe(MANA_REWARDS.TASK_LOW_IMPACT)
  })

  it('falls back to LOW for null/undefined/unknown', () => {
    expect(getTaskMana(null)).toBe(MANA_REWARDS.TASK_LOW_IMPACT)
    expect(getTaskMana(undefined)).toBe(MANA_REWARDS.TASK_LOW_IMPACT)
    expect(getTaskMana('UNKNOWN')).toBe(MANA_REWARDS.TASK_LOW_IMPACT)
  })
})

describe('getManaForSource', () => {
  it('returns HABIT constant for habit source', () => {
    expect(getManaForSource('habit')).toBe(MANA_REWARDS.HABIT)
  })

  it('returns OBJECTIVE constant for objective source', () => {
    expect(getManaForSource('objective')).toBe(MANA_REWARDS.OBJECTIVE)
  })

  it('returns JOURNAL constant for journal source', () => {
    expect(getManaForSource('journal')).toBe(MANA_REWARDS.JOURNAL)
  })

  it('delegates to getTaskMana for task source with HIGH impact', () => {
    expect(getManaForSource('task', { impact: 'HIGH' })).toBe(MANA_REWARDS.TASK_HIGH_IMPACT)
  })

  it('delegates to getTaskMana for task source with MEDIUM impact', () => {
    expect(getManaForSource('task', { impact: 'MEDIUM' })).toBe(MANA_REWARDS.TASK_MID_IMPACT)
  })

  it('defaults task source without ctx to LOW impact', () => {
    expect(getManaForSource('task')).toBe(MANA_REWARDS.TASK_LOW_IMPACT)
  })
})
