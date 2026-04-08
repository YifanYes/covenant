'use client'
import { cn } from '@/lib/cn.lib'
import { MaterialRarity, type MaterialDefinition } from '@shared/constants/materials'
import { useTranslation } from 'react-i18next'

interface MaterialCardProps {
  material: MaterialDefinition
  quantity: number
  requiredQuantity?: number
}

const tierColors: Record<number, string> = {
  1: 'border-border',
  2: 'border-blue-400/50 bg-blue-400/5',
  3: 'border-purple-400/50 bg-purple-400/5'
}

const rarityBadgeColors: Record<string, string> = {
  [MaterialRarity.COMMON]: 'bg-slate-500/20 text-slate-400',
  [MaterialRarity.UNCOMMON]: 'bg-green-500/20 text-green-400',
  [MaterialRarity.RARE]: 'bg-blue-500/20 text-blue-400',
  [MaterialRarity.LEGENDARY]: 'bg-purple-500/20 text-purple-400'
}

export default function MaterialCard({ material, quantity, requiredQuantity }: MaterialCardProps) {
  const { t } = useTranslation()

  const displayName = t(material.nameKey)
  const hasEnough = requiredQuantity === undefined || quantity >= requiredQuantity
  const displayQuantity = requiredQuantity !== undefined ? `${quantity}/${requiredQuantity}` : quantity

  return (
    <div
      className={cn(
        'relative flex flex-col items-center rounded-lg border-2 p-3 transition-all',
        tierColors[material.tier] || 'border-border',
        !hasEnough && requiredQuantity !== undefined && 'opacity-50'
      )}
    >
      {/* Material Icon Placeholder */}
      <div className='mb-2 flex h-12 w-12 items-center justify-center rounded-md bg-muted/50'>
        <span className='text-2xl'>
          {material.category === 'ORE' && '⚙️'}
          {material.category === 'ESSENCE' && '✨'}
          {material.category === 'FRAGMENT' && '💎'}
          {material.category === 'COMPONENT' && '🔧'}
        </span>
      </div>

      {/* Material Name */}
      <div className='text-center'>
        <div className='text-sm font-medium leading-tight'>{displayName}</div>
        <div
          className={cn(
            'mt-1 text-lg font-bold',
            !hasEnough && requiredQuantity !== undefined ? 'text-destructive' : 'text-foreground'
          )}
        >
          {displayQuantity}
        </div>
      </div>

      {/* Tier & Rarity Badge */}
      <div className='mt-2 flex gap-1'>
        <span className='rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-medium'>T{material.tier}</span>
        <span className={cn('rounded-sm px-1.5 py-0.5 text-[10px] font-medium', rarityBadgeColors[material.rarity])}>
          {material.rarity.charAt(0)}
        </span>
      </div>
    </div>
  )
}
