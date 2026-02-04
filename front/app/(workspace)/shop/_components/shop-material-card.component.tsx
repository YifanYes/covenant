'use client'
import { cn } from '@/lib/cn.lib'
import Button from '@/ui/button.component'
import { Minus, Money, Plus } from '@nsmr/pixelart-react'
import { MaterialRarity, type MaterialDefinition } from '@shared/constants/materials'
import { useTranslation } from 'react-i18next'

interface ShopMaterialCardProps {
  material: MaterialDefinition
  price: number
  canPurchase: boolean
  canAfford: boolean
  quantity: number
  onQuantityChange: (quantity: number) => void
  onBuy: () => void
  isPurchasing: boolean
}

const tierColors: Record<number, string> = {
  1: 'border-slate-400/50',
  2: 'border-blue-400/50 bg-blue-400/5',
  3: 'border-purple-400/50 bg-purple-400/5'
}

const rarityBadgeColors: Record<string, string> = {
  [MaterialRarity.COMMON]: 'bg-slate-500/20 text-slate-400',
  [MaterialRarity.UNCOMMON]: 'bg-green-500/20 text-green-400',
  [MaterialRarity.RARE]: 'bg-blue-500/20 text-blue-400',
  [MaterialRarity.LEGENDARY]: 'bg-purple-500/20 text-purple-400'
}

export default function ShopMaterialCard({
  material,
  price,
  canPurchase,
  canAfford,
  quantity,
  onQuantityChange,
  onBuy,
  isPurchasing
}: ShopMaterialCardProps) {
  const { t } = useTranslation()
  const displayName = t(material.nameKey)
  const totalCost = price * quantity
  const isDisabled = !canPurchase || !canAfford || isPurchasing

  const handleQuantityChange = (delta: number) => {
    const newQuantity = Math.max(1, quantity + delta)
    onQuantityChange(newQuantity)
  }

  return (
    <div
      className={cn(
        'flex flex-col rounded-lg border-2 p-4 transition-all',
        tierColors[material.tier] || 'border-border',
        !canPurchase && 'opacity-50'
      )}
    >
      {/* Material Icon */}
      <div className='mb-3 flex h-14 w-14 items-center justify-center self-center rounded-md bg-muted/50'>
        <span className='text-3xl'>
          {material.category === 'ORE' && '⚙️'}
          {material.category === 'ESSENCE' && '✨'}
          {material.category === 'FRAGMENT' && '💎'}
          {material.category === 'COMPONENT' && '🔧'}
        </span>
      </div>

      {/* Material Name */}
      <div className='mb-2 text-center'>
        <div className='text-sm font-medium'>{displayName}</div>
        <div className='mt-1 flex items-center justify-center gap-1'>
          <span className='rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-medium'>T{material.tier}</span>
          <span className={cn('rounded-sm px-1.5 py-0.5 text-[10px] font-medium', rarityBadgeColors[material.rarity])}>
            {material.rarity.charAt(0)}
          </span>
        </div>
      </div>

      {/* Price per unit */}
      <div className='mb-3 flex items-center justify-center gap-1 text-sm text-muted-foreground'>
        <Money className='h-3.5 w-3.5 text-yellow-500' />
        <span>{t('store.materials.price_each', { price })}</span>
      </div>

      {/* Quantity Controls */}
      <div className='mb-3 flex items-center justify-center gap-2'>
        <Button
          variant='outline'
          size='icon'
          className='h-7 w-7'
          onClick={() => handleQuantityChange(-1)}
          disabled={quantity <= 1 || isPurchasing}
        >
          <Minus className='h-3 w-3' />
        </Button>
        <span className='min-w-8 text-center text-base font-semibold'>{quantity}</span>
        <Button
          variant='outline'
          size='icon'
          className='h-7 w-7'
          onClick={() => handleQuantityChange(1)}
          disabled={!canAfford || isPurchasing}
        >
          <Plus className='h-3 w-3' />
        </Button>
      </div>

      {/* Total and Buy Button */}
      <div className='mt-auto space-y-2'>
        <div className='flex items-center justify-center gap-1 text-sm font-medium'>
          <Money className='h-4 w-4 text-yellow-500' />
          <span>{totalCost}</span>
        </div>
        <Button className='w-full' size='sm' onClick={onBuy} disabled={isDisabled}>
          {isPurchasing ? t('store.buying') : t('store.buy')}
        </Button>
      </div>
    </div>
  )
}
