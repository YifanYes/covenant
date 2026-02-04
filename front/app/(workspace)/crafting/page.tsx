'use client'
import OnboardingRedirect from '@/components/shared/onboarding-redirect'
import Tabs, { TabsContent, TabsList, TabsTrigger } from '@/ui/tabs.component'
import { queryClient, trpcOptions } from '@/utils/trpc.utils'
import { Coin } from '@nsmr/pixelart-react'
import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import MaterialInventory from './_components/material-inventory.component'
import RecipeList from './_components/recipe-list.component'

function CraftingContent() {
  const { t } = useTranslation()
  const { data: materialsData } = useSuspenseQuery(trpcOptions.crafting.getMaterials.queryOptions())
  const { data: recipesData } = useSuspenseQuery(trpcOptions.crafting.listRecipes.queryOptions())

  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [craftingRecipeId, setCraftingRecipeId] = useState<string | null>(null)

  const craftMutation = useMutation({
    ...trpcOptions.crafting.craft.mutationOptions(),
    onMutate: (variables) => {
      setCraftingRecipeId(variables.recipeId)
    },
    onSuccess: (result) => {
      toast.success(t('crafting.success.craft'), {
        description: `${result.craftedItems.length}x ${t('crafting.result')}`
      })
      queryClient.invalidateQueries({ queryKey: trpcOptions.crafting.getMaterials.queryKey() })
      queryClient.invalidateQueries({ queryKey: trpcOptions.crafting.listRecipes.queryKey() })
      queryClient.invalidateQueries({ queryKey: trpcOptions.character.getCurrentClass.queryKey() })
    },
    onError: (error) => {
      toast.error(t('crafting.error.craft'), { description: error.message })
    },
    onSettled: () => {
      setCraftingRecipeId(null)
    }
  })

  const filteredRecipes = useMemo(() => {
    if (categoryFilter === 'all') return recipesData.recipes
    return recipesData.recipes.filter((rs) => rs.recipe.category === categoryFilter)
  }, [recipesData.recipes, categoryFilter])

  const handleCraft = (recipeId: string) => {
    craftMutation.mutate({ recipeId })
  }

  return (
    <div className='flex h-full w-full flex-col gap-4 overflow-hidden p-4'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-white'>{t('crafting.title')}</h1>
          <p className='text-sm text-muted-foreground'>{t('crafting.subtitle')}</p>
        </div>
        <div className='flex items-center gap-2 rounded-lg px-4 py-2'>
          <span className='font-bold text-yellow-400'>{recipesData.gold.toLocaleString()}</span>
          <Coin size={24} />
        </div>
      </div>

      <Tabs defaultValue='recipes' className='flex flex-1 flex-col overflow-hidden'>
        <TabsList className='w-fit'>
          <TabsTrigger value='recipes'>{t('crafting.recipes')}</TabsTrigger>
          <TabsTrigger value='materials'>{t('crafting.materials')}</TabsTrigger>
        </TabsList>

        <TabsContent value='recipes' className='mt-4 flex-1 overflow-hidden'>
          <div className='flex-1 overflow-y-auto pr-2'>
            <RecipeList
              recipes={filteredRecipes}
              craftingRecipeId={craftingRecipeId}
              onCraft={handleCraft}
              categoryFilter={categoryFilter}
              onCategoryChange={setCategoryFilter}
            />
          </div>
        </TabsContent>

        <TabsContent value='materials' className='mt-4 flex-1 overflow-hidden'>
          <div className='flex h-full flex-col gap-4 overflow-hidden'>
            <div className='shrink-0'>
              <h2 className='text-lg font-semibold'>
                {t('crafting.materials')}{' '}
                <span className='text-sm font-normal text-muted-foreground'>
                  ({t('crafting.tier.title', { tier: materialsData.characterTier })})
                </span>
              </h2>
            </div>
            <div className='flex-1 overflow-y-auto pr-2'>
              <MaterialInventory materials={materialsData.materials} />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function CraftingView() {
  const { data: characterData } = useSuspenseQuery(trpcOptions.character.getCurrentClass.queryOptions())

  if (!characterData) {
    return <OnboardingRedirect />
  }

  return <CraftingContent />
}
