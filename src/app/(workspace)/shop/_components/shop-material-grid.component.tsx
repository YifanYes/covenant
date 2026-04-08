'use client'
import type { ShopMaterialInfo } from '@shared/types/crafting.types'
import { useTranslation } from 'react-i18next'
import ShopMaterialCard from './shop-material-card.component'

interface ShopMaterialGridProps {
  materials: ShopMaterialInfo[]
  gold: number
  quantities: Record<string, number>
  purchasingMaterialId: string | null
  onQuantityChange: (materialId: string, quantity: number) => void
  onBuy: (materialId: string) => void
}

export default function ShopMaterialGrid({
  materials,
  gold,
  quantities,
  purchasingMaterialId,
  onQuantityChange,
  onBuy
}: ShopMaterialGridProps) {
  const { t } = useTranslation()

  if (materials.length === 0) {
    return (
      <div className='flex h-full items-center justify-center text-muted-foreground'>{t('store.no_items')}</div>
    )
  }

  // Group materials by tier
  const materialsByTier = materials.reduce(
    (acc, m) => {
      const tier = m.material.tier
      if (!acc[tier]) acc[tier] = []
      acc[tier].push(m)
      return acc
    },
    {} as Record<number, ShopMaterialInfo[]>
  )

  const sortedTiers = Object.keys(materialsByTier)
    .map(Number)
    .sort((a, b) => a - b)

  return (
    <div className='h-full space-y-6 overflow-y-auto pr-2'>
      {sortedTiers.map((tier) => (
        <div key={tier}>
          <h3 className='mb-3 text-sm font-semibold text-muted-foreground'>
            {t('store.filter.tier')} {tier}
          </h3>
          <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'>
            {materialsByTier[tier].map((info) => {
              const quantity = quantities[info.materialId] || 1
              const totalCost = info.price * quantity
              const canAfford = gold >= totalCost

              return (
                <ShopMaterialCard
                  key={info.materialId}
                  material={info.material}
                  price={info.price}
                  canPurchase={info.canPurchase}
                  canAfford={canAfford}
                  quantity={quantity}
                  onQuantityChange={(qty) => onQuantityChange(info.materialId, qty)}
                  onBuy={() => onBuy(info.materialId)}
                  isPurchasing={purchasingMaterialId === info.materialId}
                />
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
