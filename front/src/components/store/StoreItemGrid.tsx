import { ScrollArea } from '@/components/ui/scroll-area'
import type { ItemDefinition } from '@shared/constants/items'
import { useTranslation } from 'react-i18next'
import StoreItemCard from './StoreItemCard'

interface StoreItemGridProps {
  itemsByTier: Record<number, ItemDefinition[]>
  selectedIds: Set<string>
  availableGold: number
  onToggle: (itemId: string) => void
}

export default function StoreItemGrid({ itemsByTier, selectedIds, availableGold, onToggle }: StoreItemGridProps) {
  const { t } = useTranslation()
  const sortedTiers = Object.entries(itemsByTier).sort(([a], [b]) => parseInt(a) - parseInt(b))
  const isEmpty = sortedTiers.length === 0

  const canAfford = (price: number) => availableGold >= price

  return (
    <ScrollArea className='h-full pr-4 pb-2 pl-6'>
      <div className='space-y-6 px-1'>
        {sortedTiers.map(([tier, items]) => (
          <div key={tier}>
            <h3 className='text-muted-foreground mb-3 text-sm font-semibold'>
              {t('store.tier')} {tier}
            </h3>
            <div className='grid gap-3 sm:grid-cols-1 lg:grid-cols-2'>
              {items.map((item) => (
                <StoreItemCard
                  key={item.id}
                  item={item}
                  isSelected={selectedIds.has(item.id)}
                  canAfford={canAfford(item.price)}
                  onToggle={() => onToggle(item.id)}
                />
              ))}
            </div>
          </div>
        ))}
        {isEmpty && (
          <div className='text-muted-foreground flex h-40 items-center justify-center'>{t('store.no_items')}</div>
        )}
      </div>
    </ScrollArea>
  )
}
