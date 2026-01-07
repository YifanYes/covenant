import { Group } from '@nsmr/pixelart-react'
import type { InventoryCharacter, InventoryItem } from '@shared/types/gamification.types'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import ItemCard from './ItemCard'

interface InventoryGridProps {
  character: InventoryCharacter
  selectedItemId?: string
  onItemClick?: (item: InventoryItem) => void
}

export default function InventoryGrid({ character, selectedItemId, onItemClick }: InventoryGridProps) {
  const { t } = useTranslation()

  return (
    <Card className='flex min-h-0 w-full flex-1 flex-col gap-0'>
      <CardHeader className='flex shrink-0 flex-row items-center justify-between pb-2'>
        <CardTitle className='flex items-center gap-2 text-sm font-medium'>
          <Group className='h-4 w-4' />
          {t('inventory.armory')}
        </CardTitle>
      </CardHeader>
      <CardContent className='flex-1 overflow-y-auto'>
        {character?.inventory?.length === 0 ? (
          <div className='flex h-full flex-col items-center justify-center gap-2'>
            <span className='text-muted-foreground text-sm'>{t('inventory.empty')}</span>
          </div>
        ) : (
          <div className='flex flex-wrap gap-2'>
            {character?.inventory?.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                isSelected={item.id === selectedItemId}
                onClick={() => onItemClick?.(item)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
