import { Faction } from './activities'

export interface InvestmentTemplate {
  id: string
  nameKey: string
  descriptionKey: string
  factionId: Faction
  baseTarget: number
  scaleFactor: number
  durationDays: number
  successTextKey: string
  failureTextKey: string
  contributorBonus: number
  moralityImpact: number
}

export const INVESTMENTS: Record<string, InvestmentTemplate> = {
  anti_demon_barrier: {
    id: 'anti_demon_barrier',
    nameKey: 'investments.anti_demon_barrier.name',
    descriptionKey: 'investments.anti_demon_barrier.description',
    factionId: Faction.HOLY_KNIGHTS,
    baseTarget: 1000,
    scaleFactor: 80,
    durationDays: 30,
    successTextKey: 'investments.anti_demon_barrier.success',
    failureTextKey: 'investments.anti_demon_barrier.failure',
    contributorBonus: 200,
    moralityImpact: 20
  },
  providence_purification: {
    id: 'providence_purification',
    nameKey: 'investments.providence_purification.name',
    descriptionKey: 'investments.providence_purification.description',
    factionId: Faction.HOLY_KNIGHTS,
    baseTarget: 2000,
    scaleFactor: 100,
    durationDays: 30,
    successTextKey: 'investments.providence_purification.success',
    failureTextKey: 'investments.providence_purification.failure',
    contributorBonus: 300,
    moralityImpact: 20
  },
  dark_heart_operation: {
    id: 'dark_heart_operation',
    nameKey: 'investments.dark_heart_operation.name',
    descriptionKey: 'investments.dark_heart_operation.description',
    factionId: Faction.HOLY_KNIGHTS,
    baseTarget: 2500,
    scaleFactor: 125,
    durationDays: 30,
    successTextKey: 'investments.dark_heart_operation.success',
    failureTextKey: 'investments.dark_heart_operation.failure',
    contributorBonus: 500,
    moralityImpact: 20
  },
  gen2_armament_program: {
    id: 'gen2_armament_program',
    nameKey: 'investments.gen2_armament_program.name',
    descriptionKey: 'investments.gen2_armament_program.description',
    factionId: Faction.HOLY_KNIGHTS,
    baseTarget: 1500,
    scaleFactor: 90,
    durationDays: 21,
    successTextKey: 'investments.gen2_armament_program.success',
    failureTextKey: 'investments.gen2_armament_program.failure',
    contributorBonus: 250,
    moralityImpact: 20
  }
}

export function getInvestmentById(id: string): InvestmentTemplate | undefined {
  return INVESTMENTS[id]
}
