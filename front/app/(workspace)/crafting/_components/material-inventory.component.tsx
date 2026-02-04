'use client'
import type { MaterialWithQuantity } from '@shared/types/crafting.types'
import { useTranslation } from 'react-i18next'
import MaterialCard from './material-card.component'

interface MaterialInventoryProps {
  materials: MaterialWithQuantity[]
}

export default function MaterialInventory({ materials }: MaterialInventoryProps) {
  const { t } = useTranslation()

  // Group materials by tier
  const materialsByTier = materials.reduce(
    (acc, mq) => {
      const tier = mq.material.tier
      if (!acc[tier]) acc[tier] = []
      acc[tier].push(mq)
      return acc
    },
    {} as Record<number, MaterialWithQuantity[]>
  )

  if (materials.length === 0) {
    return (
      <div className='flex h-32 items-center justify-center text-muted-foreground'>{t('crafting.no_materials')}</div>
    )
  }

  return (
    <div className='space-y-6'>
      {[1, 2, 3].map((tier) => {
        const tierMaterials = materialsByTier[tier]
        if (!tierMaterials || tierMaterials.length === 0) return null

        return (
          <div key={tier}>
            <h3 className='mb-3 text-sm font-semibold text-muted-foreground'>Tier {tier}</h3>
            <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'>
              {tierMaterials.map((mq) => (
                <MaterialCard key={mq.material.id} material={mq.material} quantity={mq.quantity} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
