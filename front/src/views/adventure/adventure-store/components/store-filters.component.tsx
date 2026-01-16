import Select, { SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select.component'
import { Money } from '@nsmr/pixelart-react'
import { useTranslation } from 'react-i18next'

interface StoreFiltersProps {
  gold: number
  tierFilter: string
  typeFilter: string
  onTierChange: (value: string) => void
  onTypeChange: (value: string) => void
}

export default function StoreFilters({ gold, tierFilter, typeFilter, onTierChange, onTypeChange }: StoreFiltersProps) {
  const { t } = useTranslation()

  return (
    <div className='flex items-center justify-between gap-4'>
      <div className='flex items-center gap-2'>
        <Money className='h-5 w-5 text-yellow-500' />
        <span className='font-semibold'>{gold}</span>
        <span className='text-muted-foreground text-sm font-normal'>{t('inventory.gold')}</span>
      </div>
      <div className='flex gap-2'>
        <Select value={tierFilter} onValueChange={onTierChange}>
          <SelectTrigger className='w-[160px] cursor-pointer'>
            <SelectValue placeholder={t('store.filter.tier')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>{t('store.filter.all_tiers')}</SelectItem>
            <SelectItem value='1'>{t('store.filter.tier')} 1</SelectItem>
            <SelectItem value='2'>{t('store.filter.tier')} 2</SelectItem>
            <SelectItem value='3'>{t('store.filter.tier')} 3</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={onTypeChange}>
          <SelectTrigger className='w-[160px] cursor-pointer'>
            <SelectValue placeholder={t('store.filter.type')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>{t('store.filter.all_types')}</SelectItem>
            <SelectItem value='WEAPON'>{t('item_categories.type.weapon')}</SelectItem>
            <SelectItem value='ARMOR'>{t('item_categories.type.armor')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
