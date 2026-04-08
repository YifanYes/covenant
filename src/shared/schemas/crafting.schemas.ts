import { z } from 'zod'

// Input schema for crafting an item
export const craftItemInputSchema = z.object({
  recipeId: z.string().min(1)
})

export type CraftItemInput = z.infer<typeof craftItemInputSchema>

// Input schema for buying materials from shop
export const buyMaterialInputSchema = z.object({
  materialId: z.string().min(1),
  quantity: z.number().int().min(1).max(100)
})

export type BuyMaterialInput = z.infer<typeof buyMaterialInputSchema>

// Input schema for buying multiple materials
export const buyMaterialsInputSchema = z.object({
  purchases: z.array(
    z.object({
      materialId: z.string().min(1),
      quantity: z.number().int().min(1).max(100)
    })
  )
})

export type BuyMaterialsInput = z.infer<typeof buyMaterialsInputSchema>
