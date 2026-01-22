import { z } from 'zod'

export const listInvestmentsSchema = z.object({
  characterId: z.uuid()
})
export type ListInvestmentsInput = z.infer<typeof listInvestmentsSchema>

export const contributeSchema = z.object({
  investmentId: z.uuid(),
  characterId: z.uuid(),
  amount: z.number().int().min(1)
})
export type ContributeInput = z.infer<typeof contributeSchema>
