import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useId } from 'react'

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
      {label && (
        <label
          htmlFor={selectId}
          className='mb-1 inline-flex items-center gap-1 pl-0.5 text-sm font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
        >
          <span>{label}</span>
          {required && <span className='text-destructive leading-none'>*</span>}
        </label>
      )}
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
