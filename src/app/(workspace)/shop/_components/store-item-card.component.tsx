'use client'
import { panelChrome } from '@/components/rpg/rpg-styles'
import { cn } from '@/lib/cn.lib'
import type { ItemDefinition } from '@/shared/constants/items.constants'
import Button from '@/ui/button.component'
import { ItemType } from '@shared/types/gamification.types'
import Image from 'next/image'
import { ShoppingCart as Cart, Minus, Money, Plus } from 'pixelarticons/react'
import { useTranslation } from 'react-i18next'
import StoreItemTooltip from './store-item-tooltip.component'

interface StoreItemCardProps {
  item: ItemDefinition
  isSelected: boolean
  canAfford: boolean
  isTierRestricted: boolean
  characterTier: number
  quantity?: number
  maxQuantity?: number
  onToggle: () => void
  onQuantityChange?: (quantity: number) => void
}

export default function StoreItemCard({
  item,
  isSelected,
  canAfford,
  isTierRestricted,
  characterTier,
  quantity = 1,
  maxQuantity,
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
    const newQuantity = quantity + delta

    // Check max limit if defined
    if (maxQuantity && newQuantity > maxQuantity) return

    const validQuantity = Math.max(1, newQuantity)
    onQuantityChange(validQuantity)
  }

  return (
    <StoreItemTooltip item={item} isTierRestricted={isTierRestricted} characterTier={characterTier}>
      <div
        className={cn(
          panelChrome,
          'relative flex items-center gap-3 p-3 text-left transition-all',
          isSelected && 'border-primary',
          isDisabled && 'cursor-not-allowed opacity-40',
          !isDisabled && !isSelected && 'hover:bg-primary/20 hover:border-primary/20'
        )}
      >
        {isSelected && !isConsumable && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-black/50">
            <Cart className="text-primary h-10 w-10" />
          </div>
        )}

        <button
          onClick={onToggle}
          disabled={isDisabled}
          className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center"
        >
          <Image src={itemImagePath} alt={displayName} width={40} height={40} className="h-10 w-10 object-contain" />
        </button>

        <div className="min-w-0 flex-1">
          <button onClick={onToggle} disabled={isDisabled} className="w-full cursor-pointer text-left">
            <div className="truncate pr-6 text-sm font-medium">{displayName}</div>
            <div className="text-muted-foreground line-clamp-1 text-xs">{displayDescription}</div>
          </button>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-muted-foreground text-xs italic">{t('store.random_rarity')}</span>

            {isConsumable && isSelected ? (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleQuantityChange(-1)
                  }}
                  disabled={quantity <= 1}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="min-w-6 text-center text-sm font-medium">{quantity}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleQuantityChange(1)
                  }}
                  disabled={!canAfford || (maxQuantity !== undefined && quantity >= maxQuantity)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
                <span className="flex items-center gap-1 text-sm font-medium">
                  <Money className="h-3.5 w-3.5 text-yellow-500" />
                  {item.price * quantity}
                </span>
              </div>
            ) : (
              <span className="flex items-center gap-1 text-sm font-medium">
                <Money className="h-3.5 w-3.5 text-yellow-500" />
                {item.price}
              </span>
            )}
          </div>
        </div>
      </div>
    </StoreItemTooltip>
  )
}
