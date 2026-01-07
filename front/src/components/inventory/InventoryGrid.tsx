import type { InventoryItem } from '@shared/types/gamification.types'
import { useTranslation } from 'react-i18next'
import ItemCard from './ItemCard'

interface InventoryGridProps {
  items: InventoryItem[]
  selectedItemId?: string
  onItemClick?: (item: InventoryItem) => void
}

export default function InventoryGrid({ items, selectedItemId, onItemClick }: InventoryGridProps) {
  const { t } = useTranslation()

  if (items.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center gap-2 py-8'>
        <span className='text-muted-foreground text-sm'>{t('inventory.empty')}</span>
      </div>
    )
  }

  return (
    <div className='flex flex-wrap gap-2'>
      {items.map((item) => (
        <ItemCard
          key={item.id}
          item={item}
          isSelected={item.id === selectedItemId}
          onClick={() => onItemClick?.(item)}
        />
      ))}
    </div>
  )
}
