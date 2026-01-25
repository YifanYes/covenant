'use client'
import MultiSelect from '@/forms/multi-select.component'
import type { Objective } from '@/types/models.types'
import type { Control } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

interface ObjectivesSelectorProps {
  control: Control<any>
  objectives: Objective[]
  name?: string
  placeholder?: string
  label?: string
}

export default function ObjectivesSelector({
  control,
  objectives,
  name = 'objectives',
  placeholder,
  label
}: ObjectivesSelectorProps) {
  const { t } = useTranslation()

  return (
    <MultiSelect
      name={name}
      control={control}
      items={objectives.map(({ id, name: label }) => ({ id, label })) || []}
      placeholder={placeholder || t('objectives.selector.placeholder')}
      label={label}
    />
  )
}
