import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useId } from 'react'
import FormLabel from './FormLabel'

export const SingleSelect = ({
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
  onChange: (date: string | null) => void
  value?: string
  label?: string
  required?: boolean
  errorMessage?: string
}) => {
  const generatedId = useId()
  const selectId = `singleselect-${generatedId}`
  const effectivePlaceholder = placeholder && required ? `${placeholder} *` : placeholder

  return (
    <div className='w-full space-y-1'>
      {label && <FormLabel htmlFor={selectId} label={label} required={required} />}
      <Select onValueChange={onChange} value={value}>
        <SelectTrigger className='w-full' id={selectId} aria-invalid={!!errorMessage}>
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
      {errorMessage && (
        <p className='text-destructive text-sm' role='alert'>
          {errorMessage}
        </p>
      )}
    </div>
  )
}

export default SingleSelect
