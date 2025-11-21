import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useFormField } from '@/hooks/use-form-field'
import FormField from './FormField'

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
        <SelectTrigger className='w-full' id={fieldId} aria-invalid={!!errorMessage}>
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
