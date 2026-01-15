import { cn } from '@/lib/cn.lib'
import { Cart, Money } from '@nsmr/pixelart-react'
import type { ItemDefinition } from '@shared/constants/items'
import { ItemRarity } from '@shared/types/gamification.types'
import { useTranslation } from 'react-i18next'
import { StoreItemTooltip } from './store-item-tooltip.component'

interface StoreItemCardProps {
  item: ItemDefinition
  isSelected: boolean
  canAfford: boolean
  isTierRestricted: boolean
  characterTier: number
  onToggle: () => void
}

const rarityBorderColors: Record<ItemRarity, string> = {
  [ItemRarity.COMMON]: 'border-gray-500/50',
  [ItemRarity.RARE]: 'border-purple-500/50 bg-purple-500/5',
  [ItemRarity.LEGENDARY]: 'border-yellow-500/50 bg-yellow-500/5'
}

export default function StoreItemCard({
  item,
  isSelected,
  canAfford,
  isTierRestricted,
  characterTier,
  onToggle
}: StoreItemCardProps) {
  const { t } = useTranslation()
  const isDisabled = (isTierRestricted || !canAfford) && !isSelected
  const itemImagePath = `/assets/items/${item.id}.png`

  return (
    <StoreItemTooltip item={item} isTierRestricted={isTierRestricted} characterTier={characterTier}>
      <button
        onClick={onToggle}
        disabled={isDisabled}
        className={cn(
          'relative flex items-center gap-3 rounded-md border-2 p-3 text-left transition-all',
          rarityBorderColors[item.rarity] || 'border-border',
          isSelected && 'border-primary cursor-pointer',
          isDisabled && 'cursor-not-allowed opacity-40',
          !isDisabled && !isSelected && 'hover:bg-primary/20 hover:border-primary/20 cursor-pointer'
        )}
      >
        {isSelected && (
          <div className='absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-black/50'>
            <Cart className='text-primary h-10 w-10' />
          </div>
        )}

        <div className='flex h-12 w-12 shrink-0 items-center justify-center'>
          <img src={itemImagePath} alt={item.name} className='h-10 w-10 object-contain' />
        </div>

        <div className='min-w-0 flex-1'>
          <div className='truncate pr-6 text-sm font-medium'>{item.name}</div>
          <div className='text-muted-foreground line-clamp-1 text-xs'>{item.description}</div>
          <div className='mt-1 flex items-center justify-between'>
            <span className='text-muted-foreground text-xs'>
              {t(`item_categories.rarity.${item.rarity.toLowerCase()}`)}
            </span>
            <span className='flex items-center gap-1 text-sm font-medium'>
              <Money className='h-3.5 w-3.5 text-yellow-500' />
              {item.price}
            </span>
          </div>
        </div>
      </button>
    </StoreItemTooltip>
  )
}
