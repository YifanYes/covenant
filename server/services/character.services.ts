import { getMaxDiceForTier, getTierFromLevel } from '@shared/constants/dice.constants'
import { type Character, type CharacterClass } from '../generated/prisma'

export const getCharacterProgress = (
  character: Character & {
    classes: CharacterClass[]
  }
) => {
  const currentClass = character.classes.find((c) => c.className === character.currentClass)
  const tier = getTierFromLevel(currentClass?.level || 1)
  const maxDice = getMaxDiceForTier(tier)
  const diceBank = (character.data as any)?.diceBank || 0

  return {
    currentClass,
    tier,
    maxDice,
    diceBank
  }
}
