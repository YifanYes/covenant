import { Close, Money } from '@nsmr/pixelart-react'
import type { ItemDefinition } from '@shared/constants/items'
import { ItemRarity } from '@shared/types/gamification.types'
import StoreItemTooltip from './store-item-tooltip.component'

interface CartItemProps {
  item: ItemDefinition
  onRemove: () => void
}

const rarityStyles: Record<ItemRarity, string> = {
  [ItemRarity.LEGENDARY]: 'border-yellow-500/50 bg-yellow-500/5',
  [ItemRarity.RARE]: 'border-purple-500/50 bg-purple-500/5',
  [ItemRarity.COMMON]: 'border-gray-500/50'
}

export default function CartItem({ item, onRemove }: CartItemProps) {
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
        <img src={`/assets/items/${item.id}.png`} alt={item.name} className='h-8 w-8 shrink-0 object-contain' />
        <div className='w-0 flex-1'>
          <div className='truncate text-sm font-medium'>{item.name}</div>
          <div className='text-muted-foreground flex items-center gap-1 text-xs'>
            <Money className='h-3 w-3 text-yellow-500' />
            {item.price}
          </div>
        </div>
      </div>
    </StoreItemTooltip>
  )
}
