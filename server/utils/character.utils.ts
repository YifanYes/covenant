import { getMaxDiceForTier } from '@shared/constants/dice.constants'
import type { CharacterClassType, CharacterProgress, CharacterWithClasses } from '@shared/types/character.types'

export function getCharacterProgress(character: CharacterWithClasses): CharacterProgress {
  const currentClass = character.classes.find((c) => c.className === character.currentClass)
  const tier = currentClass?.tier || 1
  const maxDice = getMaxDiceForTier(tier)
  const diceBank = (character.data as Record<string, unknown>)?.diceBank as number || 0

  return {
    currentClass: currentClass as CharacterClassType | undefined,
    tier,
    maxDice,
    diceBank
  }
}
