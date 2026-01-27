'use client'
import MultiSelect from '@/forms/multi-select.component'
import type { Area } from '@/types/models.types'
import type { Control } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

interface AreasSelectorProps {
  control: Control<any>
  areas: Area[]
  name?: string
  placeholder?: string
  label?: string
}

export default function AreasSelector({
  control,
  areas,
  name = 'areas',
  placeholder,
  label
}: AreasSelectorProps) {
  const { t } = useTranslation()

  return (
    <MultiSelect
      name={name}
      control={control}
      items={areas.map(({ id, name: label }) => ({ id, label: t(label) })) || []}
      placeholder={placeholder || t('areas.selector.placeholder')}
      label={label}
    />
  )
}
