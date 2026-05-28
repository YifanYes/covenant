'use client'
import MultiSelect from '@/forms/multi-select.component'
import type { Area } from '@/types/models.types'
import type { Control, FieldPath, FieldValues } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

interface AreasSelectorProps<TFieldValues extends FieldValues = FieldValues> {
  control: Control<TFieldValues>
  areas: Area[]
  name?: FieldPath<TFieldValues>
  placeholder?: string
  label?: string
}

export default function AreasSelector<TFieldValues extends FieldValues = FieldValues>({
  control,
  areas,
  name,
  placeholder,
  label
}: AreasSelectorProps<TFieldValues>) {
  const { t } = useTranslation()

  return (
    <MultiSelect
      name={name ?? ('areas' as FieldPath<TFieldValues>)}
      control={control}
      items={areas.map(({ publicId, name: label }) => ({ id: publicId, label: t(label) })) || []}
      placeholder={placeholder || t('areas.selector.placeholder')}
      label={label}
    />
  )
}
