import Card, { CardContent, CardHeader, CardTitle } from '@/ui/card.component'
import { Group } from '@nsmr/pixelart-react'
import { createInventoryItem, TIER_1_ITEMS } from '@shared/constants/items'
import type { InventoryCharacter, InventoryItem } from '@shared/types/gamification.types'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import ItemCard from './item-card.component'

interface InventoryGridProps {
  character: InventoryCharacter
  selectedItemId?: string
  onItemClick?: (item: InventoryItem) => void
}

export default function InventoryGrid({ character, selectedItemId, onItemClick }: InventoryGridProps) {
  const { t } = useTranslation()

  // Combine tier 1 items (always available) with character's inventory
  // Exclude items that are currently equipped in the loadout
  const availableItems = useMemo(() => {
    const equippedDefinitionIds = new Set(character?.loadout?.map((item) => item.definitionId) || [])

    // Create inventory items from tier 1 definitions (these use definitionId as id for stable keys)
    const tier1Items = Object.values(TIER_1_ITEMS)
      .map((def) => ({
        ...createInventoryItem(def),
        id: def.id
      }))
      .filter((item) => !equippedDefinitionIds.has(item.definitionId))

    // Add purchased items from character inventory (excluding equipped)
    const purchasedItems = (character?.inventory || []).filter((item) => !equippedDefinitionIds.has(item.definitionId))

    return [...tier1Items, ...purchasedItems]
  }, [character?.inventory, character?.loadout])

  return (
    <Card className='flex h-fit w-full flex-1 flex-col gap-0'>
      <CardHeader className='flex shrink-0 flex-row items-center justify-between pb-2'>
        <CardTitle className='flex items-center gap-2 text-sm font-medium'>
          <Group className='h-4 w-4' />
          {t('inventory.armory')}
        </CardTitle>
      </CardHeader>
      <CardContent className='flex-1 overflow-y-auto'>
        {availableItems.length === 0 ? (
          <div className='flex h-full flex-col items-center justify-center gap-2'>
            <span className='text-muted-foreground text-sm'>{t('inventory.empty')}</span>
          </div>
        ) : (
          <div className='flex flex-wrap gap-2 py-1'>
            {availableItems.map((item) => (
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
