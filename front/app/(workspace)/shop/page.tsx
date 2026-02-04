'use client'
import OnboardingRedirect from '@/components/shared/onboarding-redirect'
import Card, { CardContent, CardHeader, CardTitle } from '@/ui/card.component'
import Tabs, { TabsContent, TabsList, TabsTrigger } from '@/ui/tabs.component'
import { queryClient, trpcOptions } from '@/utils/trpc.utils'
import type { ItemDefinition } from '@shared/constants/items'
import { ItemType } from '@shared/types/gamification.types'
import { Money } from '@nsmr/pixelart-react'
import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import CartPanel from './_components/cart-panel.component'
import ShopMaterialGrid from './_components/shop-material-grid.component'
import StoreFilters from './_components/store-filters.component'
import StoreItemGrid from './_components/store-item-grid.component'

function StoreContent() {
  const { t } = useTranslation()
  const { data: store } = useSuspenseQuery(trpcOptions.store.list.queryOptions())
  const { data: materialsData } = useSuspenseQuery(trpcOptions.store.listMaterials.queryOptions())

  const [tierFilter, setTierFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [consumableQuantities, setConsumableQuantities] = useState<Record<string, number>>({})

  // Material purchase state
  const [materialQuantities, setMaterialQuantities] = useState<Record<string, number>>({})
  const [purchasingMaterialId, setPurchasingMaterialId] = useState<string | null>(null)

  const storePurchaseMutation = useMutation({
    ...trpcOptions.store.buy.mutationOptions(),
    onSuccess: (result) => {
      toast.success(t('store.success.buy'), {
        description: `${result.purchasedItems.length} ${t('store.items_purchased')}`
      })
      setSelectedIds(new Set())
      setConsumableQuantities({})
      queryClient.invalidateQueries({ queryKey: trpcOptions.store.list.queryKey() })
      queryClient.invalidateQueries({ queryKey: trpcOptions.character.getCurrentClass.queryKey() })
    },
    onError: (error) => toast.error(t('store.error.buy'), { description: error.message })
  })

  const buyMaterialMutation = useMutation({
    ...trpcOptions.store.buyMaterial.mutationOptions(),
    onMutate: (variables) => {
      setPurchasingMaterialId(variables.materialId)
    },
    onSuccess: () => {
      toast.success(t('store.materials.success'))
      queryClient.invalidateQueries({ queryKey: trpcOptions.store.listMaterials.queryKey() })
      queryClient.invalidateQueries({ queryKey: trpcOptions.crafting.getMaterials.queryKey() })
      queryClient.invalidateQueries({ queryKey: trpcOptions.character.getCurrentClass.queryKey() })
    },
    onError: (error) => toast.error(t('store.error.buy_material'), { description: error.message }),
    onSettled: () => {
      setPurchasingMaterialId(null)
    }
  })

  const filteredItems = useMemo(() => {
    return store.items.filter((item) => {
      if (tierFilter !== 'all' && item.tier !== parseInt(tierFilter)) return false
      if (typeFilter !== 'all' && !item.type.includes(typeFilter)) return false
      return true
    })
  }, [store.items, tierFilter, typeFilter])

  const itemsByTier = useMemo(() => {
    const grouped: Record<number, ItemDefinition[]> = {}
    filteredItems.forEach((item) => {
      if (!grouped[item.tier]) {
        grouped[item.tier] = []
      }
      grouped[item.tier].push(item)
    })
    return grouped
  }, [filteredItems])

  const selectedItems = useMemo(
    () => store.items.filter((item) => selectedIds.has(item.id)),
    [store.items, selectedIds]
  )

  const cartTotal = useMemo(() => {
    return selectedItems.reduce((sum, item) => {
      const quantity = item.type === ItemType.CONSUMABLE ? consumableQuantities[item.id] || 1 : 1
      return sum + item.price * quantity
    }, 0)
  }, [selectedItems, consumableQuantities])

  const availableGold = store.gold - cartTotal

  const toggleItem = (itemId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) {
        next.delete(itemId)
        setConsumableQuantities((q) => {
          const newQ = { ...q }
          delete newQ[itemId]
          return newQ
        })
      } else {
        next.add(itemId)
      }
      return next
    })
  }

  const handleQuantityChange = (itemId: string, quantity: number) => {
    setConsumableQuantities((prev) => ({
      ...prev,
      [itemId]: quantity
    }))
  }

  const removeFromCart = (itemId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.delete(itemId)
      return next
    })
    setConsumableQuantities((q) => {
      const newQ = { ...q }
      delete newQ[itemId]
      return newQ
    })
  }

  const handleBuy = () => {
    if (selectedIds.size === 0) return

    // Expand consumable quantities into repeated item IDs
    const itemIds: string[] = []
    for (const itemId of selectedIds) {
      const item = store.items.find((i) => i.id === itemId)
      const quantity = item?.type === ItemType.CONSUMABLE ? consumableQuantities[itemId] || 1 : 1

      for (let i = 0; i < quantity; i++) {
        itemIds.push(itemId)
      }
    }

    storePurchaseMutation.mutate({ itemIds })
  }

  const handleMaterialQuantityChange = (materialId: string, quantity: number) => {
    setMaterialQuantities((prev) => ({
      ...prev,
      [materialId]: quantity
    }))
  }

  const handleBuyMaterial = (materialId: string) => {
    const quantity = materialQuantities[materialId] || 1
    buyMaterialMutation.mutate({ materialId, quantity })
  }

  return (
    <Tabs defaultValue='items' className='flex h-full w-full flex-col overflow-hidden pr-4'>
      <div className='mb-4 flex items-center justify-between'>
        <TabsList>
          <TabsTrigger value='items'>{t('store.title')}</TabsTrigger>
          <TabsTrigger value='materials'>{t('store.materials.title')}</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value='items' className='mt-0 flex flex-1 gap-6 overflow-hidden'>
        {/* Left Panel - Store Items */}
        <Card className='flex flex-1 flex-col gap-4 overflow-hidden py-4'>
          <CardHeader className='shrink-0'>
            <CardTitle>
              <StoreFilters
                gold={store.gold}
                tierFilter={tierFilter}
                typeFilter={typeFilter}
                onTierChange={setTierFilter}
                onTypeChange={setTypeFilter}
              />
            </CardTitle>
          </CardHeader>
          <CardContent className='flex-1 overflow-hidden p-0 pr-2'>
            <StoreItemGrid
              itemsByTier={itemsByTier}
              selectedIds={selectedIds}
              availableGold={availableGold}
              characterTier={store.characterTier}
              consumableQuantities={consumableQuantities}
              onToggle={toggleItem}
              onQuantityChange={handleQuantityChange}
            />
          </CardContent>
        </Card>

        {/* Right Panel - Cart */}
        <CartPanel
          items={selectedItems}
          total={cartTotal}
          maxGold={store.gold}
          isLoading={storePurchaseMutation.isPending}
          consumableQuantities={consumableQuantities}
          onRemove={removeFromCart}
          onBuy={handleBuy}
        />
      </TabsContent>

      <TabsContent value='materials' className='mt-0 flex-1 overflow-hidden'>
        <Card className='flex h-full flex-col gap-4 overflow-hidden py-4'>
          <CardHeader className='shrink-0'>
            <CardTitle>
              <div className='flex items-center gap-2'>
                <Money className='h-5 w-5 text-yellow-500' />
                <span className='font-semibold'>{materialsData.gold}</span>
                <span className='text-muted-foreground text-sm font-normal'>{t('inventory.gold')}</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className='flex-1 overflow-hidden p-0 px-4'>
            <ShopMaterialGrid
              materials={materialsData.materials}
              gold={materialsData.gold}
              quantities={materialQuantities}
              purchasingMaterialId={purchasingMaterialId}
              onQuantityChange={handleMaterialQuantityChange}
              onBuy={handleBuyMaterial}
            />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

export default function StoreView() {
  const { data: characterData } = useSuspenseQuery(trpcOptions.character.getCurrentClass.queryOptions())

  if (!characterData) {
    return <OnboardingRedirect />
  }

  return <StoreContent />
}
