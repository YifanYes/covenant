'use client'
import { panelChrome } from '@/components/rpg/rpg-styles'
import OnboardingRedirect from '@/components/shared/onboarding-redirect'
import { cn } from '@/lib/cn.lib'
import Card, { CardContent, CardHeader, CardTitle } from '@/ui/card.component'
import { queryClient, trpcOptions } from '@/utils/trpc.utils'
import type { ItemDefinition } from '@shared/constants/items'
import { ItemType } from '@shared/types/gamification.types'
import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import CartPanel from './_components/cart-panel.component'
import StoreFilters from './_components/store-filters.component'
import StoreItemGrid from './_components/store-item-grid.component'

function StoreContent() {
  const { t } = useTranslation()
  const { data: store } = useSuspenseQuery(trpcOptions.store.list.queryOptions())

  const [tierFilter, setTierFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [consumableQuantities, setConsumableQuantities] = useState<Record<string, number>>({})

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

  const hasActiveFilters = tierFilter !== 'all' || typeFilter !== 'all'

  const clearFilters = () => {
    setTierFilter('all')
    setTypeFilter('all')
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

  return (
    <div className="flex h-[calc(100dvh-3rem)] w-full gap-6 overflow-hidden pr-4">
      {/* Left Panel - Store Items */}
      <Card className={cn(panelChrome, 'flex min-h-0 flex-1 flex-col gap-4 overflow-hidden py-4')}>
        <CardHeader className="shrink-0">
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
        <CardContent className="min-h-0 flex-1 overflow-hidden p-0 pr-2">
          <StoreItemGrid
            itemsByTier={itemsByTier}
            selectedIds={selectedIds}
            availableGold={availableGold}
            characterTier={store.characterTier}
            consumableQuantities={consumableQuantities}
            hasActiveFilters={hasActiveFilters}
            onToggle={toggleItem}
            onQuantityChange={handleQuantityChange}
            onClearFilters={clearFilters}
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
    </div>
  )
}

export default function StoreView() {
  const { data: characterData } = useSuspenseQuery(trpcOptions.character.getCurrentClass.queryOptions())

  if (!characterData) {
    return <OnboardingRedirect />
  }

  return <StoreContent />
}
