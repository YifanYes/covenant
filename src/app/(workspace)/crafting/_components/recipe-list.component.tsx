'use client'
import type { RecipeWithStatus } from '@shared/types/crafting.types'
import { useTranslation } from 'react-i18next'
import RecipeCard from './recipe-card.component'
import RecipeFilters from './recipe-filters.component'

interface RecipeListProps {
  recipes: RecipeWithStatus[]
  craftingRecipeId: string | null
  onCraft: (recipeId: string) => void
  categoryFilter: string
  onCategoryChange: (category: string) => void
}

export default function RecipeList({
  recipes,
  craftingRecipeId,
  onCraft,
  categoryFilter,
  onCategoryChange
}: RecipeListProps) {
  const { t } = useTranslation()

  // Group recipes by tier
  const recipesByTier = recipes.reduce(
    (acc, rs) => {
      const tier = rs.recipe.tier
      if (!acc[tier]) acc[tier] = []
      acc[tier].push(rs)
      return acc
    },
    {} as Record<number, RecipeWithStatus[]>
  )

  if (recipes.length === 0) {
    return (
      <div className='flex h-32 items-center justify-center text-muted-foreground'>{t('crafting.no_recipes')}</div>
    )
  }

  const tiers = [1, 2, 3].filter((tier) => recipesByTier[tier]?.length > 0)

  return (
    <div className='space-y-8'>
      {tiers.map((tier, index) => {
        const tierRecipes = recipesByTier[tier]

        return (
          <div key={tier}>
            <div className='mb-4 flex items-start justify-between gap-4'>
              <div>
                <h3 className='text-xl font-bold text-white'>{t('crafting.tier.title', { tier })}</h3>
                <p className='text-sm text-muted-foreground'>{t(`crafting.tier.description_${tier}`)}</p>
              </div>
              {index === 0 && (
                <RecipeFilters categoryFilter={categoryFilter} onCategoryChange={onCategoryChange} />
              )}
            </div>
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
              {tierRecipes.map((recipeStatus) => (
                <RecipeCard
                  key={recipeStatus.recipe.id}
                  recipeStatus={recipeStatus}
                  onCraft={() => onCraft(recipeStatus.recipe.id)}
                  isCrafting={craftingRecipeId === recipeStatus.recipe.id}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
