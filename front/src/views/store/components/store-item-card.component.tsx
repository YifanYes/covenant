import { cn } from '@/lib/cn.lib'
import Button from '@/ui/button.component'
import { Cart, Money } from '@nsmr/pixelart-react'
import type { ItemDefinition } from '@shared/constants/items'
import { ItemRarity, ItemType } from '@shared/types/gamification.types'
import { Minus, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import StoreItemTooltip from './store-item-tooltip.component'

interface StoreItemCardProps {
  item: ItemDefinition
  isSelected: boolean
  canAfford: boolean
  isTierRestricted: boolean
  characterTier: number
  quantity?: number
  onToggle: () => void
  onQuantityChange?: (quantity: number) => void
}

const rarityBorderColors: Record<ItemRarity, string> = {
  [ItemRarity.COMMON]: 'border-rarity-common/50',
  [ItemRarity.RARE]: 'border-rarity-rare/50 bg-rarity-rare/5',
  [ItemRarity.LEGENDARY]: 'border-rarity-legendary/50 bg-rarity-legendary/5'
}

export default function StoreItemCard({
  item,
  isSelected,
  canAfford,
  isTierRestricted,
  characterTier,
  quantity = 1,
  onToggle,
  onQuantityChange
}: StoreItemCardProps) {
  const { t } = useTranslation()
  const isConsumable = item.type === ItemType.CONSUMABLE
  const isDisabled = (isTierRestricted || !canAfford) && !isSelected
  const itemImagePath = `/assets/items/${item.id}.png`

  const displayName = t(item.nameKey)
  const displayDescription = t(item.descriptionKey)

  const handleQuantityChange = (delta: number) => {
    if (!onQuantityChange) return
    const newQuantity = Math.max(1, quantity + delta)
    onQuantityChange(newQuantity)
  }

  return (
    <StoreItemTooltip item={item} isTierRestricted={isTierRestricted} characterTier={characterTier}>
      <div
        className={cn(
          'relative flex items-center gap-3 rounded-md border-2 p-3 text-left transition-all',
          rarityBorderColors[item.rarity] || 'border-border',
          isSelected && 'border-primary',
          isDisabled && 'cursor-not-allowed opacity-40',
          !isDisabled && !isSelected && 'hover:bg-primary/20 hover:border-primary/20'
        )}
      >
        {isSelected && !isConsumable && (
          <div className='absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-black/50'>
            <Cart className='text-primary h-10 w-10' />
          </div>
        )}

        <button
          onClick={onToggle}
          disabled={isDisabled}
          className='flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center'
        >
          <img src={itemImagePath} alt={displayName} className='h-10 w-10 object-contain' />
        </button>

        <div className='min-w-0 flex-1'>
          <button onClick={onToggle} disabled={isDisabled} className='w-full cursor-pointer text-left'>
            <div className='truncate pr-6 text-sm font-medium'>{displayName}</div>
            <div className='text-muted-foreground line-clamp-1 text-xs'>{displayDescription}</div>
          </button>
          <div className='mt-1 flex items-center justify-between'>
            <span className='text-muted-foreground text-xs'>
              {t(`item_categories.rarity.${item.rarity.toLowerCase()}`)}
            </span>

            {isConsumable && isSelected ? (
              <div className='flex items-center gap-1'>
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-6 w-6'
                  onClick={(e) => {
                    e.stopPropagation()
                    handleQuantityChange(-1)
                  }}
                  disabled={quantity <= 1}
                >
                  <Minus className='h-3 w-3' />
                </Button>
                <span className='min-w-6 text-center text-sm font-medium'>{quantity}</span>
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-6 w-6'
                  onClick={(e) => {
                    e.stopPropagation()
                    handleQuantityChange(1)
                  }}
                  disabled={!canAfford}
                >
                  <Plus className='h-3 w-3' />
                </Button>
                <span className='flex items-center gap-1 text-sm font-medium'>
                  <Money className='h-3.5 w-3.5 text-yellow-500' />
                  {item.price * quantity}
                </span>
              </div>
            ) : (
              <span className='flex items-center gap-1 text-sm font-medium'>
                <Money className='h-3.5 w-3.5 text-yellow-500' />
                {item.price}
              </span>
            )}
          </div>
        </div>
      </div>
    </StoreItemTooltip>
  )
}
