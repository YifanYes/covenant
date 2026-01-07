import { cn } from '@/lib/utils'
import { ItemRarity, type InventoryItem } from '@shared/types/gamification.types'
import { Crosshair, Gem, Shield, Sword, Wand2 } from 'lucide-react'
import ItemTooltip from './ItemTooltip'

interface ItemCardProps {
  item: InventoryItem
  isSelected?: boolean
  onClick?: () => void
}

const typeIcons = {
  WEAPON_MELEE: Sword,
  WEAPON_RANGED: Crosshair,
  WEAPON_MAGIC: Wand2,
  ARMOR: Shield,
  ACCESSORY: Gem
}

const rarityBorderColors = {
  COMMON: 'border-gray-500',
  RARE: 'border-purple-500',
  LEGENDARY: 'border-yellow-500'
}

const rarityGlowColors = {
  COMMON: '',
  RARE: 'shadow-purple-500/20',
  LEGENDARY: 'shadow-yellow-500/30'
}

export default function ItemCard({ item, isSelected, onClick }: ItemCardProps) {
  const Icon = typeIcons[item.type]

  return (
    <ItemTooltip item={item}>
      <button
        onClick={onClick}
        className={cn(
          'bg-card flex h-16 w-16 flex-col items-center justify-center rounded-lg border-2 p-2 transition-all hover:scale-105',
          rarityBorderColors[item.rarity],
          isSelected && 'ring-primary ring-2 ring-offset-2',
          item.rarity !== ItemRarity.COMMON && `shadow-lg ${rarityGlowColors[item.rarity]}`
        )}
      >
        <Icon className='h-6 w-6' />
        <span className='mt-1 max-w-full truncate text-[10px]'>{item.name.split(' ')[0]}</span>
      </button>
    </ItemTooltip>
  )
}
