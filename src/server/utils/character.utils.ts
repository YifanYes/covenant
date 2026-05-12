import type { CharacterClassType, CharacterProgress, CharacterWithClasses } from '@shared/types/character.types'

export function getCharacterProgress(character: CharacterWithClasses): CharacterProgress {
  const currentClass = character.classes.find((c) => c.className === character.currentClass)
  const tier = currentClass?.tier || 1
  const manaReserve = typeof character.manaReserve === 'number' ? character.manaReserve : 0

  return {
    currentClass: currentClass as CharacterClassType | undefined,
    tier,
    manaReserve
  }
}
