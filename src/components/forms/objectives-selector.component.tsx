'use client'
import MultiSelect from '@/forms/multi-select.component'
import type { Objective } from '@/types/models.types'
import type { Control, FieldPath, FieldValues } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

interface ObjectivesSelectorProps<TFieldValues extends FieldValues = FieldValues> {
  control: Control<TFieldValues>
  objectives: Objective[]
  name?: FieldPath<TFieldValues>
  placeholder?: string
  label?: string
}

export default function ObjectivesSelector<TFieldValues extends FieldValues = FieldValues>({
  control,
  objectives,
  name,
  placeholder,
  label
}: ObjectivesSelectorProps<TFieldValues>) {
  const { t } = useTranslation()

  return (
    <MultiSelect
      name={name ?? ('objectives' as FieldPath<TFieldValues>)}
      control={control}
      items={objectives.map(({ publicId, name: label }) => ({ id: publicId, label })) || []}
      placeholder={placeholder || t('objectives.selector.placeholder')}
      label={label}
    />
  )
}
