import CartPanel from '@/components/store/CartPanel'
import StoreFilters from '@/components/store/StoreFilters'
import StoreItemGrid from '@/components/store/StoreItemGrid'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { queryClient, trpc } from '@/utils/trpc.utils'
import type { ItemDefinition } from '@shared/constants/items'
import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

export default function AdventureStore() {
  const { t } = useTranslation()
  const { data: store } = useSuspenseQuery(trpc.store.list.queryOptions())
  const [tierFilter, setTierFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const storePurchaseMutation = useMutation({
    ...trpc.store.buy.mutationOptions(),
    onSuccess: (result) => {
      toast.success(t('store.success.buy'), {
        description: `${result.purchasedItems.length} ${t('store.items_purchased')}`
      })
      setSelectedIds(new Set())
      queryClient.invalidateQueries({ queryKey: trpc.store.list.queryKey() })
      queryClient.invalidateQueries({ queryKey: trpc.character.getCurrentClass.queryKey() })
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
  const cartTotal = useMemo(() => selectedItems.reduce((sum, item) => sum + item.price, 0), [selectedItems])

  const availableGold = store.gold - cartTotal

  // Handlers
  const toggleItem = (itemId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(itemId) ? next.delete(itemId) : next.add(itemId)
      return next
    })
  }

  const removeFromCart = (itemId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.delete(itemId)
      return next
    })
  }

  const handleBuy = () => {
    if (selectedIds.size === 0) return
    storePurchaseMutation.mutate({ itemIds: Array.from(selectedIds) })
  }

  return (
    <div className='flex h-full w-full gap-6 overflow-hidden pr-4'>
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
            onToggle={toggleItem}
          />
        </CardContent>
      </Card>

      {/* Right Panel - Cart */}
      <CartPanel
        items={selectedItems}
        total={cartTotal}
        maxGold={store.gold}
        isLoading={storePurchaseMutation.isPending}
        onRemove={removeFromCart}
        onBuy={handleBuy}
      />
    </div>
  )
}
