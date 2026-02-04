'use client'
import { cn } from '@/lib/cn.lib'
import Button from '@/ui/button.component'
import { Loader, Money } from '@nsmr/pixelart-react'
import { getMaterialById } from '@shared/constants/materials'
import type { RecipeWithStatus } from '@shared/types/crafting.types'
import { useTranslation } from 'react-i18next'

interface RecipeCardProps {
  recipeStatus: RecipeWithStatus
  onCraft: () => void
  isCrafting: boolean
}

export default function RecipeCard({ recipeStatus, onCraft, isCrafting }: RecipeCardProps) {
  const { t } = useTranslation()
  const { recipe, canCraft, missingMaterials, hasEnoughGold } = recipeStatus

  const displayName = t(recipe.nameKey)
  const displayDescription = t(recipe.descriptionKey)

  return (
    <div
      className={cn(
        'border-foreground/20 bg-background flex flex-col rounded-lg border-2 p-4 transition-all',
        !canCraft && 'opacity-60'
      )}
    >
      {/* Header */}
      <div className='mb-3 flex items-start justify-between'>
        <div>
          <h3 className='font-semibold'>{displayName}</h3>
          <p className='text-xs text-muted-foreground'>{displayDescription}</p>
        </div>
        <span className='rounded-sm bg-muted px-2 py-0.5 text-xs font-medium'>T{recipe.tier}</span>
      </div>

      {/* Ingredients */}
      <div className='mb-3 flex-1'>
        <h4 className='mb-2 text-xs font-semibold text-muted-foreground'>{t('crafting.ingredients')}</h4>
        <div className='space-y-1'>
          {recipe.ingredients.map((ingredient) => {
            const material = getMaterialById(ingredient.materialId)
            if (!material) return null

            const materialName = t(material.nameKey)
            const missing = missingMaterials.find((m) => m.materialId === ingredient.materialId)
            const hasEnough = !missing

            return (
              <div key={ingredient.materialId} className='flex items-center justify-between text-sm'>
                <span className={cn(hasEnough ? 'text-green-500' : 'text-muted-foreground')}>{materialName}</span>
                <span className={cn('font-medium', hasEnough ? 'text-green-500' : 'text-muted-foreground')}>
                  {missing ? `${missing.have}/${ingredient.quantity}` : `${ingredient.quantity}x`}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Gold Cost & Result */}
      <div className='mb-3 flex items-center justify-between border-t border-border/50 pt-3'>
        <div className='text-sm'>
          <span className='text-muted-foreground'>{t('crafting.result')}: </span>
          <span className='font-medium'>{recipe.resultQuantity}x</span>
        </div>
        {recipe.goldCost > 0 && (
          <div className={cn('flex items-center gap-1', !hasEnoughGold && 'text-muted-foreground')}>
            <Money className='h-4 w-4 text-yellow-500' />
            <span className='font-medium'>{recipe.goldCost}</span>
          </div>
        )}
      </div>

      {/* Craft Button */}
      <Button onClick={onCraft} disabled={!canCraft || isCrafting} className='w-full' size='sm'>
        {isCrafting ? (
          <>
            <Loader className='mr-2 h-4 w-4 animate-spin' />
            {t('crafting.crafting')}
          </>
        ) : (
          t('crafting.craft')
        )}
      </Button>
    </div>
  )
}
