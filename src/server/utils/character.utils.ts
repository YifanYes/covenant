import type { CharacterClassType, CharacterProgress, CharacterWithClasses } from '@shared/types/character.types'

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
  const diceBank = extractDiceBank(character.data)

  return {
    currentClass: currentClass as CharacterClassType | undefined,
    tier,
    diceBank
  }
}
