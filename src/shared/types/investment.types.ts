export const InvestmentStatus = {
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED'
} as const
export type InvestmentStatus = (typeof InvestmentStatus)[keyof typeof InvestmentStatus]

export interface InvestmentWithProgress {
  id: string
  investmentId: string
  factionName: string
  status: InvestmentStatus
  currentAmount: number
  targetAmount: number
  deadline: Date | string
  nameKey: string
  descriptionKey: string
  percentComplete: number
  myContribution: number
}

export interface ContributeResult {
  success: boolean
  newTotal: number
  characterGold: number
  investmentCompleted: boolean
  moralityDelta?: number
}
