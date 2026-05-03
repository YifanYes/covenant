'use client'
import ScrollArea from '@/ui/scroll-area.component'
import type { ItemDefinition } from '@shared/constants/items'
import { ItemType } from '@shared/types/gamification.types'
import { useTranslation } from 'react-i18next'
import StoreItemCard from './store-item-card.component'

interface StoreItemGridProps {
  itemsByTier: Record<number, ItemDefinition[]>
  selectedIds: Set<string>
  availableGold: number
  characterTier: number
  consumableQuantities: Record<string, number>
  onToggle: (itemId: string) => void
  onQuantityChange: (itemId: string, quantity: number) => void
}

export default function StoreItemGrid({
  itemsByTier,
  selectedIds,
  availableGold,
  characterTier,
  consumableQuantities,
  onToggle,
  onQuantityChange
}: StoreItemGridProps) {
  const { t } = useTranslation()
  const sortedTiers = Object.entries(itemsByTier).sort(([a], [b]) => parseInt(a) - parseInt(b))
  const isEmpty = sortedTiers.length === 0

  const canAfford = (itemId: string, price: number) => {
    const currentQuantity = consumableQuantities[itemId] || 1
    return availableGold >= price || (selectedIds.has(itemId) && availableGold + price * currentQuantity >= price)
  }

  return (
    <ScrollArea className="h-full pr-4 pb-2 pl-6">
      <div className="space-y-6 px-1">
        {sortedTiers.map(([tier, items]) => (
          <div key={tier}>
            <h3 className="text-muted-foreground mb-3 text-sm font-semibold">
              {t('store.tier')} {tier}
            </h3>
            <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
              {items.map((item) => (
                <StoreItemCard
                  key={item.id}
                  item={item}
                  isSelected={selectedIds.has(item.id)}
                  canAfford={canAfford(item.id, item.price)}
                  isTierRestricted={item.tier > characterTier}
                  characterTier={characterTier}
                  quantity={consumableQuantities[item.id] || 1}
                  maxQuantity={item.type === ItemType.CONSUMABLE ? characterTier + 2 : undefined}
                  onToggle={() => onToggle(item.id)}
                  onQuantityChange={(q) => onQuantityChange(item.id, q)}
                />
              ))}
            </div>
          </div>
        ))}
        {isEmpty && (
          <div className="text-muted-foreground flex h-40 items-center justify-center">{t('store.no_items')}</div>
        )}
      </div>
    </ScrollArea>
  )
}
