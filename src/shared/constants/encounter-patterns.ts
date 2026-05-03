import type { EnemyType } from './enemies'

export interface EncounterSlot {
  type: EnemyType
  optional?: boolean
  chance?: number // Probability (0-1) for optional slots
}

export interface EncounterPattern {
  tier: number
  slots: EncounterSlot[]
}

/**
 * Encounter patterns by character tier
 * Each tier defines a sequence of enemy types the player will face
 */
export const ENCOUNTER_PATTERNS: Record<number, EncounterPattern> = {
  1: {
    tier: 1,
    slots: [{ type: 'MINION' }, { type: 'MINION', optional: true, chance: 0.3 }]
  },
  2: {
    tier: 2,
    slots: [{ type: 'MINION' }, { type: 'MINION' }, { type: 'ELITE' }]
  },
  3: {
    tier: 3,
    slots: [
      { type: 'MINION' },
      { type: 'ELITE' },
      { type: 'MINION', optional: true, chance: 0.4 },
      { type: 'BOSS', optional: true, chance: 0.4 }
    ]
  },
  4: {
    tier: 4,
    slots: [{ type: 'ELITE' }, { type: 'MINION' }, { type: 'ELITE' }, { type: 'BOSS' }]
  }
}

/**
 * Resolved encounter slot (after optional slots are determined)
 */
export interface ResolvedEncounterSlot {
  type: EnemyType
  index: number
}

/**
 * Generate a resolved encounter sequence for a character tier
 * Resolves optional slots based on their chance
 */
export function generateEncounterSequence(characterTier: number): ResolvedEncounterSlot[] {
  const pattern = ENCOUNTER_PATTERNS[characterTier] || ENCOUNTER_PATTERNS[1]
  const sequence: ResolvedEncounterSlot[] = []

  for (let i = 0; i < pattern.slots.length; i++) {
    const slot = pattern.slots[i]

    if (slot.optional) {
      // Roll for optional slot
      if (Math.random() < (slot.chance || 0.5)) {
        sequence.push({ type: slot.type, index: i })
      }
    } else {
      sequence.push({ type: slot.type, index: i })
    }
  }

  return sequence
}

/**
 * Get the next encounter slot from the sequence
 * Returns null if the sequence is complete
 */
export function getNextEncounterSlot(
  sequence: ResolvedEncounterSlot[],
  currentIndex: number
): ResolvedEncounterSlot | null {
  if (currentIndex >= sequence.length) {
    return null
  }
  return sequence[currentIndex]
}

/**
 * Get encounter pattern for a character tier
 * Falls back to tier 1 if tier not defined
 */
export function getEncounterPattern(characterTier: number): EncounterPattern {
  return ENCOUNTER_PATTERNS[characterTier] || ENCOUNTER_PATTERNS[1]
}
