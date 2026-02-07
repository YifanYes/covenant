import type { CharacterClassType, CharacterWithClasses } from '@shared/types/character.types'
import type { DiceRollResult } from '@shared/types/gamification.types'

export function rollDice(count: number): number[] {
  const result: number[] = new Array(count)
  for (let i = 0; i < count; i++) {
    result[i] = Math.floor(Math.random() * 6) + 1
  }
  return result
}

/**
 * Calculate hits from dice rolls with optional guaranteed critical
 * @param rolls The dice rolls to evaluate
 * @param threshold The success threshold (e.g., 4+ means values >= 4 succeed)
 * @param criticalThreshold The critical hit threshold (5 for fast weapons, 6 for slow)
 *        - Criticals always hit regardless of threshold
 *        - Criticals can only be blocked by other criticals (6s)
 * @param guaranteedCritical If true, all successful hits are treated as criticals
 */
export function calculateHitsWithCount(
  rolls: number[],
  threshold: number,
  criticalThreshold: number = 6,
  guaranteedCritical: boolean = false
): { results: DiceRollResult[]; count: number } {
  let count = 0
  const results = rolls.map((value) => {
    const isCritical = guaranteedCritical || value >= criticalThreshold
    const isSuccess = isCritical || value >= threshold
    if (isSuccess) count++
    return { value, isSuccess, isCritical }
  })
  return { results, count }
}

export function getCurrentClassOrThrow(character: CharacterWithClasses): CharacterClassType {
  const currentClass = character.classes.find((c) => c.className === character.currentClass)
  if (!currentClass) {
    throw new Error(`Character class ${character.currentClass} not found`)
  }
  return currentClass
}
