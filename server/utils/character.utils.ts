import { getMaxDiceForTier } from '@shared/constants/dice.constants'
import type { CharacterClassType, CharacterProgress, CharacterWithClasses } from '@shared/types/character.types'

/**
 * Safely extracts the diceBank value from character data.
 * Returns 0 if data is missing, malformed, or diceBank is not a valid number.
 */
function extractDiceBank(data: unknown): number {
  if (data === null || typeof data !== 'object') {
    return 0
  }

  const dataObj = data as Record<string, unknown>
  const diceBank = dataObj.diceBank

  if (typeof diceBank === 'number' && Number.isFinite(diceBank) && diceBank >= 0) {
    return diceBank
  }

  return 0
}

export function getCharacterProgress(character: CharacterWithClasses): CharacterProgress {
  const currentClass = character.classes.find((c) => c.className === character.currentClass)
  const tier = currentClass?.tier || 1
  const maxDice = getMaxDiceForTier(tier)
  const diceBank = extractDiceBank(character.data)

  return {
    currentClass: currentClass as CharacterClassType | undefined,
    tier,
    maxDice,
    diceBank
  }
}
