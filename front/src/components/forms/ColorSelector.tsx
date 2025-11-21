import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { colorOptions } from '@/types/constants.types'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import FormLabel from './FormLabel'

export default function ColorSelector({
  className,
  value,
  onChange,
  label,
  required,
  errorMessage
}: {
  className?: string
  value?: string
  onChange?: (value: string) => void
  label?: string
  required?: boolean
  errorMessage?: string
}) {
  const { t } = useTranslation()
  const generatedId = useId()
  const selectId = `colorselector-${generatedId}`
  const placeholderText = t('colors.placeholder')
  const effectivePlaceholder = required ? `${placeholderText} *` : placeholderText

  return (
    <div className='w-full space-y-1'>
      {label && <FormLabel htmlFor={selectId} label={label} required={required} />}
      <Select value={value ?? ''} onValueChange={onChange}>
        <SelectTrigger className={className} id={selectId} aria-invalid={!!errorMessage}>
          <SelectValue placeholder={effectivePlaceholder} />
        </SelectTrigger>
        <SelectContent>
          {colorOptions.map(({ color, styles }) => (
            <SelectItem key={color} value={color}>
              <div className='flex items-center gap-2'>
                <span className={`h-4 w-4 rounded-full ${styles}`} />
                <span>{t(`colors.${color}`)}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {errorMessage && (
        <p className='text-destructive text-sm' role='alert'>
          {errorMessage}
        </p>
      )}
    </div>
  )
}
