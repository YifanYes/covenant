'use client'
import Select, { SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select.component'
import { RecipeCategory } from '@shared/constants/recipes'
import { useTranslation } from 'react-i18next'

interface RecipeFiltersProps {
  categoryFilter: string
  onCategoryChange: (category: string) => void
}

export default function RecipeFilters({ categoryFilter, onCategoryChange }: RecipeFiltersProps) {
  const { t } = useTranslation()

  return (
    <div className='flex items-center justify-end'>
      <Select value={categoryFilter} onValueChange={onCategoryChange}>
        <SelectTrigger className='w-40'>
          <SelectValue placeholder={t('crafting.filter.all')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='all'>{t('crafting.filter.all')}</SelectItem>
          <SelectItem value={RecipeCategory.WEAPON}>{t('crafting.filter.weapon')}</SelectItem>
          <SelectItem value={RecipeCategory.ARMOR}>{t('crafting.filter.armor')}</SelectItem>
          <SelectItem value={RecipeCategory.CONSUMABLE}>{t('crafting.filter.consumable')}</SelectItem>
          <SelectItem value={RecipeCategory.ACCESSORY}>{t('crafting.filter.accessory')}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
