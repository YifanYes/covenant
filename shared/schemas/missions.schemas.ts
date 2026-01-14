import z from 'zod'

export const attackSchema = z.object({
  attackRolls: z.array(z.number().min(1).max(6)).min(1),
  defenseRolls: z.array(z.number().min(1).max(6)).min(0)
})
export type AttackType = z.infer<typeof attackSchema>
