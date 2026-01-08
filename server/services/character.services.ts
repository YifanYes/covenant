import { getMaxDiceForTier } from '@shared/constants/dice.constants'
import { type Character, type CharacterClass } from '../generated/prisma'

export const getCharacterProgress = (
  character: Character & {
    classes: CharacterClass[]
  }
) => {
  const currentClass = character.classes.find((c) => c.className === character.currentClass)
  const tier = currentClass?.tier || 1
  const missionProgress = (currentClass?.missionProgress as Record<string, number>) || {}
  const maxDice = getMaxDiceForTier(tier)
  const diceBank = (character.data as any)?.diceBank || 0

  return {
    currentClass,
    tier,
    missionProgress,
    maxDice,
    diceBank
  }
}

export const createRandomPartyName = () => {
  const adjectives = [
    'Brave',
    'Silent',
    'Iron',
    'Shadow',
    'Golden',
    'Crimson',
    'Silver',
    'Storm',
    'Eternal',
    'Fierce',
    'Noble',
    'Mystic',
    'Dark',
    'Blazing',
    'Frozen',
    'Thunder',
    'Ancient',
    'Wild',
    'Swift',
    'Proud',
    'Vengeful',
    'Radiant',
    'Lunar',
    'Solar',
    'Scarlet',
    'Azure',
    'Emerald',
    'Onyx',
    'Ivory',
    'Dread',
    'Valiant',
    'Hollow'
  ]
  const nouns = [
    'Wolves',
    'Ravens',
    'Knights',
    'Seekers',
    'Guards',
    'Blades',
    'Shields',
    'Hunters',
    'Dragons',
    'Sentinels',
    'Vanguard',
    'Phoenix',
    'Falcons',
    'Lions',
    'Reapers',
    'Wardens',
    'Titans',
    'Crusaders',
    'Phantoms',
    'Legion',
    'Serpents',
    'Talons',
    'Vipers',
    'Corsairs',
    'Champions',
    'Marauders',
    'Templars',
    'Stalkers',
    'Wraiths',
    'Paladins',
    'Shadows',
    'Griffins'
  ]
  return `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`
}
