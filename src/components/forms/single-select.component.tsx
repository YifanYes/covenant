'use client'
import { useFormField } from '@/hooks/use-form-field'
import Select, { SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select.component'
import FormField from './form-field.component'

export default function SingleSelect({
  placeholder,
  options,
  onChange,
  value,
  label,
  required,
  errorMessage
}: {
  placeholder?: string
  options: { value: string; label: string }[]
  onChange: (value: string | null) => void
  value?: string
  label?: string
  required?: boolean
  errorMessage?: string
}) {
  const { fieldId, effectivePlaceholder } = useFormField({
    placeholder,
    required,
    componentPrefix: 'singleselect'
  })

  return (
    <FormField label={label} required={required} errorMessage={errorMessage} htmlFor={fieldId}>
      <Select onValueChange={onChange} value={value}>
        <SelectTrigger
          className='hover:bg-accent hover:text-accent-foreground dark:hover:bg-input/50 w-full transition-all duration-200'
          id={fieldId}
          aria-invalid={!!errorMessage}
        >
          <SelectValue placeholder={effectivePlaceholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  )
}
