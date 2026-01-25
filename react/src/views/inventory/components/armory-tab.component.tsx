import Button from '@/ui/button.component'
import Select, { SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select.component'
import { Close } from '@nsmr/pixelart-react'
import {
  EquipmentTypeFilter,
  type InventoryCharacter,
  type InventoryItem,
  type SlotType
} from '@shared/types/gamification.types'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import InventoryGrid from './inventory-grid.component'
import LoadoutPanel from './loadout-panel.component'

interface ArmoryTabProps {
  character: InventoryCharacter
  onEquipItem: (item: InventoryItem) => void
  onUnequipItem: (slotType: SlotType) => void
}

export default function ArmoryTab({ character, onEquipItem, onUnequipItem }: ArmoryTabProps) {
  const { t } = useTranslation()
  const [tierFilter, setTierFilter] = useState<number | null>(null)
  const [typeFilter, setTypeFilter] = useState<EquipmentTypeFilter>('all')

  // Get available tier values based on character tier
  const availableTiers = Array.from({ length: character.tier }, (_, i) => i + 1)

  const hasActiveFilters = tierFilter !== null || typeFilter !== 'all'

  const clearFilters = useCallback(() => {
    setTierFilter(null)
    setTypeFilter('all')
  }, [])

  return (
    <div className='flex h-full flex-col gap-4'>
      {/* Filter controls */}
      <div className='flex shrink-0 flex-wrap items-center gap-3'>
        <Select
          value={tierFilter?.toString() ?? 'all'}
          onValueChange={(value: string) => setTierFilter(value === 'all' ? null : Number(value))}
        >
          <SelectTrigger className='w-[140px]'>
            <SelectValue placeholder={t('inventory.filter.all_tiers')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>{t('inventory.filter.all_tiers')}</SelectItem>
            {availableTiers.map((tier) => (
              <SelectItem key={tier} value={tier.toString()}>
                {t('inventory.filter.tier', { tier })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={(value: string) => setTypeFilter(value as EquipmentTypeFilter)}>
          <SelectTrigger className='w-[140px]'>
            <SelectValue placeholder={t('inventory.filter.all_types')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>{t('inventory.filter.all_types')}</SelectItem>
            <SelectItem value='weapon'>{t('inventory.filter.weapon')}</SelectItem>
            <SelectItem value='armor'>{t('inventory.filter.armor')}</SelectItem>
            <SelectItem value='accessory'>{t('inventory.filter.accessory')}</SelectItem>
            <SelectItem value='consumable'>{t('inventory.filter.consumable')}</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant='outline' size='sm' onClick={clearFilters}>
            <Close className='mr-2 h-4 w-4' />
            {t('inventory.filter.clear')}
          </Button>
        )}
      </div>

      {/* Content grid */}
      <div className='grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-auto lg:grid-cols-[1fr_2fr]'>
        <LoadoutPanel character={character} onUnequip={onUnequipItem} />
        <InventoryGrid
          character={character}
          onItemClick={onEquipItem}
          tierFilter={tierFilter}
          typeFilter={typeFilter === 'all' ? null : typeFilter}
        />
      </div>
    </div>
  )
}
