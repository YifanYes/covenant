'use client'
import { cn } from '@/lib/cn.lib'
import { ItemRarity, type InventoryItem } from '@shared/types/gamification.types'
import Image from 'next/image'
import { useTranslation } from 'react-i18next'
import ItemTooltip from './item-tooltip.component'

interface ItemCardProps {
  item: InventoryItem
  quantity?: number
  isSelected?: boolean
  onClick?: () => void
}

const rarityBorderColors = {
  [ItemRarity.COMMON]: 'border-rarity-common',
  [ItemRarity.RARE]: 'border-rarity-rare',
  [ItemRarity.LEGENDARY]: 'border-rarity-legendary'
}

const rarityGlowColors = {
  [ItemRarity.COMMON]: '',
  [ItemRarity.RARE]: 'shadow-rarity-rare/20',
  [ItemRarity.LEGENDARY]: 'shadow-rarity-legendary/30'
}

export default function ItemCard({ item, quantity = 1, isSelected, onClick }: ItemCardProps) {
  const { t } = useTranslation()
  const itemName = t(item.nameKey)
  const itemImagePath = `/assets/items/${item.definitionId}.png`

  return (
    <ItemTooltip item={item} quantity={quantity}>
      <button
        onClick={onClick}
        className={cn(
          'bg-card relative z-10 flex h-25 w-25 cursor-pointer flex-col items-center justify-center rounded-lg border-2 p-1.5 transition-all hover:z-50 hover:scale-105',
          rarityBorderColors[item.rarity],
          isSelected && 'ring-primary ring-2 ring-offset-2',
          item.rarity !== ItemRarity.COMMON && `shadow-lg ${rarityGlowColors[item.rarity]}`
        )}
      >
        <Image src={itemImagePath} alt={itemName} width={48} height={48} className="h-12 w-12 object-contain" />
        <span className="mt-0.5 max-w-full truncate text-[10px]">{itemName}</span>
        {quantity > 1 && (
          <div className="absolute top-1 right-1 z-20 flex h-5 min-w-5 items-center justify-center rounded-full border border-white/10 bg-[#3b3a36] px-1 text-[10px] font-bold text-zinc-300 shadow-sm">
            {quantity}
          </div>
        )}
      </button>
    </ItemTooltip>
  )
}
