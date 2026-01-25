'use client'
import { Close, Money } from '@nsmr/pixelart-react'
import type { ItemDefinition } from '@shared/constants/items'
import { ItemRarity } from '@shared/types/gamification.types'
import { useTranslation } from 'react-i18next'
import StoreItemTooltip from './store-item-tooltip.component'

interface CartItemProps {
  item: ItemDefinition
  quantity?: number
  onRemove: () => void
}

const rarityStyles: Record<ItemRarity, string> = {
  [ItemRarity.LEGENDARY]: 'border-rarity-legendary/50 bg-rarity-legendary/5',
  [ItemRarity.RARE]: 'border-rarity-rare/50 bg-rarity-rare/5',
  [ItemRarity.COMMON]: 'border-rarity-common/50'
}

export default function CartItem({ item, quantity, onRemove }: CartItemProps) {
  const { t } = useTranslation()
  const displayName = t(item.nameKey)
  const displayQuantity = quantity || 1
  const totalPrice = item.price * displayQuantity

  return (
    <StoreItemTooltip item={item}>
      <div
        className={`relative flex cursor-default items-center gap-2 rounded-md border-2 p-2 ${rarityStyles[item.rarity] || 'border-gray-500/50'}`}
      >
        <button
          onClick={onRemove}
          className='bg-card border-destructive absolute -top-2 -right-2 z-20 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border'
        >
          <Close className='text-destructive h-3 w-3' />
        </button>
        <img src={`/assets/items/${item.id}.png`} alt={displayName} className='h-8 w-8 shrink-0 object-contain' />
        <div className='w-0 flex-1'>
          <div className='truncate text-sm font-medium'>
            {displayName}
            {displayQuantity > 1 && <span className='text-muted-foreground ml-1'>×{displayQuantity}</span>}
          </div>
          <div className='text-muted-foreground flex items-center gap-1 text-xs'>
            <Money className='h-3 w-3 text-yellow-500' />
            {totalPrice}
          </div>
        </div>
      </div>
    </StoreItemTooltip>
  )
}
