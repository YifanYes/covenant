import { useFormField } from '@/hooks/use-form-field'
import { cn } from '@/lib/cn.lib'
import { colorOptions } from '@/types/colors.types'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui'
import { useTranslation } from 'react-i18next'
import FormField from './form-field.component'

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
  const placeholderText = t('colors.placeholder')
  const { fieldId, effectivePlaceholder } = useFormField({
    placeholder: placeholderText,
    required,
    componentPrefix: 'colorselector'
  })

  return (
    <FormField label={label} required={required} errorMessage={errorMessage} htmlFor={fieldId}>
      <Select value={value ?? ''} onValueChange={onChange}>
        <SelectTrigger
          className={cn(
            'hover:bg-accent hover:text-accent-foreground dark:hover:bg-input/50 transition-all duration-200',
            className
          )}
          id={fieldId}
          aria-invalid={!!errorMessage}
        >
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
    </FormField>
  )
}
