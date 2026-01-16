import { cn } from '@/lib/cn.lib'
import { ItemRarity, type InventoryItem } from '@shared/types/gamification.types'
import { useTranslation } from 'react-i18next'
import ItemTooltip from './item-tooltip.component'

interface ItemCardProps {
  item: InventoryItem
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

export default function ItemCard({ item, isSelected, onClick }: ItemCardProps) {
  const { t } = useTranslation()
  const itemName = t(`items.${item.definitionId}.name`, { defaultValue: item.name })
  const itemImagePath = `/assets/items/${item.definitionId}.png`

  return (
    <ItemTooltip item={item}>
      <button
        onClick={onClick}
        className={cn(
          'bg-card z-10 flex h-25 w-25 cursor-pointer flex-col items-center justify-center rounded-lg border-2 p-1.5 transition-all hover:z-50 hover:scale-105',
          rarityBorderColors[item.rarity],
          isSelected && 'ring-primary ring-2 ring-offset-2',
          item.rarity !== ItemRarity.COMMON && `shadow-lg ${rarityGlowColors[item.rarity]}`
        )}
      >
        <img src={itemImagePath} alt={itemName} className='h-12 w-12 object-contain' />
        <span className='mt-0.5 max-w-full truncate text-[10px]'>{itemName}</span>
      </button>
    </ItemTooltip>
  )
}
